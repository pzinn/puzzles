// general purpose functions
Object.prototype.clone = function() {
  var newObj = (this instanceof Array) ? [] : {};
  for (i in this) {
    if (i == 'clone') continue;
    if (this[i] && typeof this[i] == "object") {
      newObj[i] = this[i].clone();
    } else newObj[i] = this[i]
  } return newObj;
};

function nestedArray(k, n, val) // k-nested arrays of length n
{
    if (k==0) { if (val instanceof Object) return val.clone(); else return val; }
    var tmp=new Array(n);
    for (var i=0; i<n; i++) tmp[i]=nestedArray(k-1,n,val);
    return tmp;
}
//

var sq3 = 1.73205080757;
var sq2 = 1.41421356237;

var icon; // little icon for current puzzle animation button

// webgl stuff
var gl;
var canvas,precanvas;  
function initGL() // init openGL
{
    try {
	gl = canvas.getContext("webgl");
//	gl = canvas.getContext("webgl", { premultipliedAlpha: false });
	gl.viewport(0, 0, canvas.width, canvas.height);
    } 
    catch(e) { alert("Could not initialise WebGL, sorry :-(");   }
}


function getShader(gl, id) 
{
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
	return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
	if (k.nodeType == 3) {
	    str += k.textContent;
	}
	k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
	shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
	shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
	return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	alert(gl.getShaderInfoLog(shader));
	return null;
    }

    return shader;
}

function makeShaderProgram(fs,vs)
{
    var fragmentShader = getShader(gl, fs);
    var vertexShader = getShader(gl, vs);

    var sp = gl.createProgram();
    gl.attachShader(sp, vertexShader);
    gl.attachShader(sp, fragmentShader);
    gl.linkProgram(sp);

    if (!gl.getProgramParameter(sp, gl.LINK_STATUS)) 
	alert("Could not initialise shaders");
    return sp;
}

var shaderProgram;

var nshaders=2; // 2 programs (pairs of shaders)

function initShaders() 
{
    shaderProgram=new Array(nshaders);
    for (var i=0; i<nshaders; i++)
	{
	    shaderProgram[i]=makeShaderProgram('shader-fs'+i,'shader-vs'+i);

	    shaderProgram[i].vertexPositionAttribute = gl.getAttribLocation(shaderProgram[i], "VertexPosition");
	    gl.enableVertexAttribArray(shaderProgram[i].vertexPositionAttribute);
	}
}

var currentProgram;
function useProgram(i)
{
    currentProgram=i;
    gl.useProgram(shaderProgram[i]);
}


function uniform(fun,str)
{
    // extract value arguments
    var args = Array.prototype.slice.call(arguments,2);
    args.unshift(null);

    if (args[0]=gl.getUniformLocation(shaderProgram[currentProgram], str)) // should we store them once and for all?
	fun.apply(gl,args); 
}


// graphical stuff
function addGraph(graph,type,indexbuf,flags,color,width,sampler)
{
    if (!graph.hasOwnProperty('data')) graph.data=[];

    var obj = new Object(); // could compress all that's below using {x:y, ... } syntax
    obj.type=type; // line, triangle, line loop
    obj.flags=flags;
    if ((typeof(width)!=='undefined')&&(width!==null)) obj.width=width; // for lines and labels only
    if ((typeof(color)!=='undefined')&&(color!==null)) obj.color=new Float32Array(color);
    if ((typeof(sampler)!=='undefined')&&(sampler!==null)) obj.sampler=sampler;
    obj.glbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.glbuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexbuf), gl.STATIC_DRAW);
    obj.n=indexbuf.length;
    graph.data.push(obj);
}

function addCoords(graph,coords) // should make it a method of graph
{
    graph.coordbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.coordbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);

    // probably shouldn't be there, but for now... necessary for proper POINTS drawing, and also LINES for mouse pointer
    function cmp(a,b) { return b.type-a.type; }
    graph.data.sort(cmp);
    
}

function deleteBuffers(graph) // make way for a new picture, possibly deleting GL buffers if we don't need them any more
{
    if (graph instanceof Array)
	{
	    for (var i=0; i<graph.length; i++)
		deleteBuffers(graph[i]);
	}
    else
	{
	    while (graph.data.length>0)
		gl.deleteBuffer(graph.data.pop().glbuffer);
	    gl.deleteBuffer(graph.coordbuffer);
	}
}


var mrot0=[
	   // standard view of puzzles (up to a rather arbitrary z coordinate)
	   [[-1/(2*sq2), sq3/sq2/2, -1/(2*sq2), sq3/sq2/2], 
	    [-sq3/sq2/2, -1/(2*sq2), -(sq3/sq2/2), -1/(2*sq2)], 
	    [1/2/sq2,-sq3/sq2/2,-1/2/sq2,sq3/sq2/2],
	    [sq3/sq2/2,1/2/sq2,-sq3/sq2/2,-1/2/sq2]],
	   // other views: square-triangle(-rhombus) tiling
	   [[1./4*(1 - sq3), 1./4*(1 + sq3), -(1./2), 1./2], 
	    [1./4*(-1 - sq3), 1./4*(1 - sq3), -(1./2), -(1./2)], 
	    [1./4*(-1 + sq3), 1./4*(-1 - sq3), -(1./2), 1./2], 
	    [1./4*(1 + sq3), 1./4*(-1 + sq3), -(1./2), -(1./2)]],	    
	   // tableaux
	   [[0, 0, 0, 1], [0, 1, 0, 0], [-1, 0, 0, 0], [0, 0, -1, 0]],	 
           //
	   [[0,0,-sq3/2,1./2],
	    [-sq3/2,1./2,0,0],
	    [0,0,-1./2,-sq3/2],
	    [1./2,sq3/2,0,0]],
	   // another funny one half-way between the previous 2
	   // actually it seems known in the lit
	   [[0,1/sq2,-sq3/sq2/2,1./2/sq2],
	    [-sq3/sq2/2,-1./2/sq2,-sq3/sq2/2,-1./2/sq2],
	    [1./2/sq2,-sq3/sq2/2,-1./2/sq2,sq3/sq2/2],
	    [1/sq2,0,-1./2/sq2,-sq3/sq2/2]],
           // honeycomb
   [[-1./2,sq3/2,0,0],[-sq3/2.,-1./2,0,0],[0,0,-sq3/2,1./2],[0,0,-1./2,-sq3/2]],
	   // dual honeycomb
	    [[0,0,-1./2,sq3/2],[0,0,-sq3/2,-1./2],[1./2,-sq3/2,0,0],[sq3/2,1./2,0,0]],
	   // regular hexagon -- ``dual puzzle''
	   [[0, 1/sq2, -(sq3/sq2/2), 1/(2*sq2)], 
	    [-(1/sq2),   0, -(1/(2*sq2)), -(sq3/sq2/2)], 
	    [0, -1/sq2, -(sq3/sq2/2), 1/(2*sq2)], 
	    [(1/sq2),   0, -(1/(2*sq2)), -(sq3/sq2/2)]],	   
	   // ``dual square-triangle-rhombus tiling''
	   [[(-1 + sq3)/4, (1 + sq3)/4, (-1 - sq3)/4, (-1 + sq3)/4], 
	    [(-1 - sq3)/4, (-1 + sq3)/4, (1 - sq3)/4,   (-1 - sq3)/4], 
	    [(1 - sq3)/4, (-1 - sq3)/4, (-1 - sq3)/4, (-1 + sq3)/4], 
	    [(1 + sq3)/4, (1 - sq3)/4, (1 - sq3)/4,   (-1 - sq3)/4]],
	   // standard view of puzzles rotated 180 degrees
	   [[1/(2*sq2), -sq3/sq2/2, 1/(2*sq2), -sq3/sq2/2], 
	    [sq3/sq2/2, 1/(2*sq2), (sq3/sq2/2), 1/(2*sq2)], 
	    [1/2/sq2,-sq3/sq2/2,-1/2/sq2,sq3/sq2/2],
	    [sq3/sq2/2,1/2/sq2,-sq3/sq2/2,-1/2/sq2]]
];

for (var i=0; i<mrot0.length; i++)
    mrot0[i]=new Matrix(mrot0[i]);

var colors4d=[[0.7,1.0,0.87,1],[1.0,0.8,0.87,1],[1.0,0.87,0.7,1],[0.87,1.0,0.7,1],[0.82,0.82,1.0,1],[0.9,1.0,0.9,1],[1.0,0.9,0.9,1],[0.94,0.94,0.94,1],[1.0,1.0,0.65,1],[1,0.9,0.8,1],[0.9,1,0.8,1],[0,0,0,1]]; // t2, t1, s2, s1, s3, r2, r1, r3, k, nd1, nd2, black
var numedges=6;
var tritype=nestedArray(3,numedges+1,-1); // color assignment depending on edges around triangle
for (var i=1; i<=numedges; i++)
    for (var j=1; j<=numedges; j++)
	for (var k=1; k<=numedges; k++)
	    tritype[i][j][k]=11;
tritype[1][1][1]=0;
tritype[2][2][2]=1;
tritype[2][3][1]=2;
tritype[3][1][2]=3;
tritype[1][2][3]=4;
tritype[4][2][1]=5;
tritype[1][4][2]=6;
tritype[2][1][4]=7;
tritype[3][3][3]=8;
tritype[1][3][5]=9;//xxxxxxxxxxxx
tritype[3][2][6]=10;//xxxxxxxxxxxx
var linecolors4d=[[0,0.5,0,1],[0.5,0,0,1],[0.4,0.4,0,1],[0,0,0,1]]; // color of lines: green, red, yellow, black

var mrot=new Matrix(1); // rotation matrix
var m1rot=new Matrix(1); // first derivative wrt time
var m2rot=new Matrix(1);// second derivative (for random anim)

var morth=
	[[1., 1./2., 0, 0], [0, sq3/2., 0, 0], [0, 0, 1., 1./2.], [0, 0, 0, sq3/2.]];    

var intens=1; // color intensity

function conv4d2d(c4d) // convert from 4d to 2d: normally it's done by the gpu but just in case
{
    var scale=document.getElementById('current').state.scale;
    var aspect=canvas.width/canvas.height;
    var i,j,k;
    var c2d=[0,0];
    for (i=0; i<2; i++)
	for (j=0; j<4; j++)
	    for (k=0; k<4; k++)
		c2d[i]+=mrot.e(i,j)*morth[j][k]*c4d[k]; // eww. rewrite better
    if (aspect<1) c2d[1]=c2d[1]*aspect; else c2d[0]=c2d[0]/aspect;
    return [(scale*c2d[0]+1)*0.5*canvas.width,(-scale*c2d[1]+1)*0.5*canvas.height]; 
}

// mask values
// 1 = green paths
// 2 = red paths
// 4 = loops
// 8 = frame
// 16 = arrows/labels
// 32 = points
// 64 = green numbering
// 128 = red numbering
// 256 = edge numbering
// 512 = dual edge numbering
// 1024 = traditional labelling
// 2048*(1/2,4/8,16/32,64/128): directions of arrows (complemented/not complemented)
var maxmask=1024; // doesn't include arrows -- just the actual toggles

function drawSceneInternal(graph,mask,scale,shift)
{
    currentProgram=-1;
    var newProgram;

    // set the active position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, graph.coordbuffer);

    for (var j=0; j<graph.data.length; j++)
	if ((graph.data[j].flags&mask) == graph.data[j].flags)
    {
	newProgram=graph.data[j].type==gl.POINTS?1:0; // points are treated specially
	if (newProgram!=currentProgram) // overkill because graph entries should be sorted. still, better this way
	    {
		useProgram(newProgram);
		uniform(gl.uniformMatrix4fv,'rotationMatrix',false,mrot.elem);
		uniform(gl.uniform1f,'aspect',canvas.width/canvas.height);
		uniform(gl.uniform1f,'scale',scale);
		uniform(gl.uniform4fv,'shift',shift);
		gl.vertexAttribPointer(shaderProgram[newProgram].vertexPositionAttribute, 4, gl.FLOAT, false, 0, 0); // not sure how useful
		gl.polygonOffset(1.,1.); // so edges are visible over polygons.
		if (newProgram==0) gl.depthMask(true); else gl.depthMask(false);
		currentProgram=newProgram;
	    }

	// set various parameters
	if (graph.data[j].color!==undefined)
	    uniform(gl.uniform4fv,'currentColor', graph.data[j].color);
	else 
	    uniform(gl.uniform4f,'currentColor', 0,0,0,1); // default = black

	if (graph.data[j].type==gl.TRIANGLES)
	    uniform(gl.uniform1f,'intens',intens);
	else
	    uniform(gl.uniform1f,'intens',1);

	if (newProgram==1) // points are treated specially
	{
	    uniform(gl.uniform1i,'sampler', graph.data[j].sampler);
	    uniform(gl.uniform1f,'pointSize', graph.data[j].width); // width is size of "point"
	}
	else
	{
	    if (graph.data[j].width!==undefined) gl.lineWidth(graph.data[j].width); // ... or thickness of lines
	}
	// then draw
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, graph.data[j].glbuffer);
	gl.drawElements(graph.data[j].type, graph.data[j].n, gl.UNSIGNED_SHORT, 0);
    }
}

// display function
function drawScene() 
{
    if (!gl) return;

    // only change the size of the canvas if the size it's being displayed
    // has changed.
    var width = precanvas.clientWidth;
    var height = precanvas.clientHeight;
    if (canvas.width != width-10 || canvas.height != height-10)
    {
	// Change the size of the canvas to match the size it's being displayed
	// 10 seems the minimum value to not trigger grid auto resize leading to infinite loop of size expansion
	canvas.width = width-10;
	canvas.height = height-10;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // gl clear screen
    gl.depthMask(true); // !!! otherwise won't clear the depth buffer...
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var current=document.getElementById("current");
    if (current===null) return;
    var graph=current.state;
    if (graph===undefined) return;

    intens=document.getElementById('intens').value;

    var i,mask;
    // recompute mask (could be done on the fly but useless optimization)
    mask=0; i=1;
    while (i<2048)
    {
	if (document.getElementById("check"+i).checked) mask+=i;
	i=2*i;
    }
    // then the complement stuff
    for (i=1; i<=4; i++)
	if (document.getElementById("y"+i+"comp").checked) mask+=2048<<(2*i-2); else mask+=2048<<(2*i-1);
    
    // set rotation matrix
    mrot.orthogonalize();

    var aspect=canvas.width/canvas.height;
    var aspectx,aspecty; if (aspect<1) { aspectx=1; aspecty=1/aspect; } else { aspectx=aspect; aspecty=1; }

    if (graph instanceof Array) // panorama
    {
	var n=graph.length;
	// n1*n2=n, n1/n2=aspect
	var n2=Math.round(Math.sqrt(n/aspect)); // number of rows
	if (n2>n) n2=n;
	if (n2>canvas.height/60) n2=Math.round(canvas.height/60); // arbitrary max
	var n1=Math.ceil(n/n2); // number of columns
	if (n1>canvas.width/60) n1=Math.round(canvas.width/60); // arbitrary max
	//	if (n>n1*n2) n=n1*n2;
	if ((n>n1*n2)&&(!current.anim)) n=n1*n2; // might as well not draw those outside the viewing area
	var sc=graph.scale*(1+aspect)/(n2*aspect+n1);
	
	for (i=0; i<n; i++)
	{
	    i1=i%n1; i2=Math.floor(i/n1);
	    if (current.anim)
	    {
		if (i!=current.sel)
		    drawSceneInternal(graph[i],mask,sc*(1-current.t),[((2*i1+1)/n1-1)*aspectx*(1-current.t),(-(2*i2+1)/n2+0.95)*aspecty*(1-current.t),-current.t,0.]);
		else
		    drawSceneInternal(graph[current.sel],mask,graph.scale*current.t+sc*(1-current.t),[((2*i1+1)/n1-1)*aspectx*(1-current.t),(-(2*i2+1)/n2+0.95)*aspecty*(1-current.t),0.,0.]);
	    }
	    else
		drawSceneInternal(graph[i],mask,sc,[((2*i1+1)/n1-1)*aspectx,(-(2*i2+1)/n2+0.95)*aspecty,0.,0.]);// 1 -> 0.95 (in y) to avoid the very top
	}
    }
    else // normal puzzle
    {
	drawSceneInternal(graph,mask,graph.scale,[0.,0.,0.,0.]);
	
	// if manual mode
	if (graph.manual)
	{
	    for (i=0; i<tiles.length; i++)
		drawSceneInternal(tiles[i],mask&(1+2+4+32),0.15,[((2*i+1)/tiles.length-1)*aspectx,-0.85*aspecty,0.,0.]);
	    // now try to create a tile-shaped pointer...
	    gl.depthFunc(gl.ALWAYS); // temporarily turn off depth -- may have weird effects with some rotations, but ultimately makes sense
	    if ((graph.select>=0)&&(mouseX!==null)&&(mouseY!==null))
		drawSceneInternal(tiles[graph.select],mask&(1+2+4+32),graph.scale,[(2*mouseX/canvas.width-1)*aspectx,(-2*mouseY/canvas.height+1)*aspecty,0.,0.]);
	    gl.depthFunc(gl.LEQUAL); // and back on
	}
    }
}

var randomanim;
var animcount;

var timerdelay=50;
var timerdelay2=20;

var nsteps=32;

//anim function
function rotateAnimFunc()
{
  if (randomanim)
    {
      if (animcount==0) // beginning of a new cycle
	{
	  m1rot.orthogonalize(); // once in a while... doesn't hurt
	  m1target=new Matrix(); m1target.randomorthog(0.002*timerdelay); 
	  m2rot.computerotation(m1rot,m1target,nsteps);
	  animcount=nsteps;
	}
      m1rot.leftmultiply(m2rot);
    }

  if (animcount) // only the active window can be animated
    {
	mrot.leftmultiply(m1rot); // do the animation
	animcount--;
	drawScene();
	setTimeout(rotateAnimFunc, timerdelay);
    }
}


var processAnimFlag=false;
var shortenAnimFlag; // only well-defined when processAnimFunc is running

function processDelay() 
{ 
    if (shortenAnimFlag) return 0;
    var as=+document.getElementById("speed").value;
    if (as>9) return 0; else return 1000*(1/(1+as)-0.095);
}


function processAnimFunc() 
{
    if (!processAnimFlag) return; // to avoid all kinds of nasty bugs...

    var res;
    var but=icon.parentElement; // yeah, a bit tricky... 
    var graph;
    var para;

    var pd=processDelay();

    var submit=document.getElementById("submit");    
    if (pd==0) // full speed
    {
	// just in case
	submit.innerHTML="Abort"; // pressing on the button again will abort
	submit.onclick=endAnim;

	destroyButton(but); but=null;

	while ((res=makePuzzle())>=0) ; // 0 (backtrack) or 1 (add one more tile)
    }
    else // normal speed animation
    {
	// just in case 
	submit.innerHTML="Finish"; // pressing on the button again will shorten animation (like speed = 11)
	submit.onclick=shortenAnim;

	animateIcon();
	
	if (but===null) // should rarely occur
	{
	    // create icon button
	    graph={};
	    but=createButton("*",graph); // make a new button which is currently displayed with empty corresponding puzzle
	}
	else
	{
	    graph=but.state;
	    deleteBuffers(graph);
	}
	res=makePuzzle();
	if (res!=-2) // -2 means the end
	{
	    buildScene(graph,res<=0); // reset coords in case we've backtracked
	    if (but.id=='current')
		drawScene(); // redraw scene in case we're watching the animation
	}
    }
    if (res!=-2)
    {
	setTimeout(processAnimFunc, pd);
	if (res==-1) // new puzzle
	{
	    npuzzles++;
	    createButton(npuzzles,buildScene({},true),but,buildUrl()).state.parts=parts; // insert before but if !==null. add "parts" to state... should be done in create button, of course
	    // debug
	    if (document.getElementById('debug').getAttribute('hidden')==null) dump();// careful, returns "" if hidden, null if not	    
	    // end debug
	}
    }
    else endAnim();
}

function makeCurrent(but) // make a puzzle the currently viewed one
{
    var old=document.getElementById('current');
    if (old)
    {
	old.removeAttribute("id");
	old.style.backgroundColor="";
    }
    if (but)
    {
	but.id='current'; // we don't really do anything, just tag it
	but.style.backgroundColor="#D0E0FF"; // and color the background
	var parts;
	if (document.getElementById("updateparts").checked && ((parts=but.state.parts)!==undefined))
	{ // ... and possibly update the partitions 
	    document.getElementById("heightrange").value=parts[0]; 
	    document.getElementById("widthrange").value=parts[1];
	    document.getElementById("height").innerHTML=parts[0]; // sadly, onchange doesn't work.....
	    document.getElementById("width").innerHTML=parts[1];
	    updateparam('double',parts.length==6);
	    resetYoung(parts.slice(2));
	    for (var i=0; i<4; i++)
                if (document.getElementById("y"+(i+1)+"comp").checked)
                    y[i].set(y[i].complement().get()); //ewww
        }
	if (but.anim) // unlikely event that we interrupted a panorama anim; or start of reverse anim
	    setTimeout(panoramaAnimFunc, timerdelay2);
    }
    drawScene();
}

function shortenAnim()
{ 
    shortenAnimFlag=true;
    processAnimFunc();
}

function endAnim() // end of process animation, either forcefully or because ran out of puzzles to make
{
    processAnimFlag=false; // to avoid all kinds of nasty bugs...

    var but=icon.parentElement; // yeah, a bit tricky... 
    var para=document.getElementById('currentpara');

    // destroy icon button
    
    if (para)
    {
	var current=document.getElementById('current');
	var flag=(current==but)||(current==para.firstElementChild)||(processDelay()==0); // whether we're staring at nothing interesting, or full speed 
	destroyButton(but);
	if (npuzzles>1)    // create a panorama if more than one puzzle
	{
	    var g=new Array();
	    var x=para.firstElementChild;
	    g.scale=x.state.scale;
	    while (x=x.nextElementSibling) // skip the first = template
		g.push(x.state);
	    x=createButton("S",g);
	    if (flag) makeCurrent(x);	// if we're staring at the template, might as well switch to panorama
	}
	else if (flag) makeCurrent(para.lastElementChild);
	// remove currentpara
	para.removeAttribute("id");
    }
    else destroyButton(but);
    
    //    
    var submit=document.getElementById("submit");
    submit.innerHTML="Process";
    submit.onclick=process;    
}


function openAssoc(e)
{
    e.preventDefault();
    window.open(this.url);
}

function createButton(text,graph,before,url="") // creates a button which secretly contains all the graphical info to draw a puzzle
{                                        // a bit risky because if somehow the buttons gets recreated, info will be lost 
    var para=document.getElementById('currentpara');
    var but=document.createElement('button');

    but.onclick=loadPuzzle;
    but.url=url;
    but.onauxclick=openAssoc;
    but.state=graph; // !
    if (text=='*')
	but.appendChild(icon);
    else
	but.innerHTML=text;
    if (before)
	para.insertBefore(but,before);
    else
	para.appendChild(but);
	
    return but;
}

function destroyButton(but)
{
    if (but!==null)
    {
	var para=but.parentElement;
	var flag=(but.id=='current');
	deleteBuffers(but.state);
	var e;
	while ((e=but.firstElementChild)!==null) // what is this about again?
	    but.removeChild(e);
	para.removeChild(but);
	if (flag) makeCurrent(para.lastElementChild); // go back to last if it exists. can't have no current... drawScene() requires it
    }
}

//controls
function toggleAnimation()
{
    if (animcount)
	animcount=randomanim=0;
    else
    {
	animcount=0;
	randomanim=1;
	setTimeout(rotateAnimFunc, timerdelay); // start animation
    }
}

var rot90=new Matrix([[1,0,0,0],[0,1,0,0],[0,0,0,1],[0,0,-1,0]]);

function rotate90()
{
    mrot.leftmultiply(rot90);
    drawScene();
}

function presetView(k)
{
    m1rot.computerotation(mrot,mrot0[k],nsteps);
    animcount=nsteps; randomanim=0;
    setTimeout(rotateAnimFunc, timerdelay); // start animation
}


var shft=[ // increments of 4d coords corresponding to edge states
    [[0,1,0,0],[0,0,0,1],[1,0,-1,1],[-1,1,1,0]], // ori = 0
    [[1,0,0,0],[0,0,1,0],[1,-1,0,1],[0,1,1,-1]], // ori = 1
    [[-1,1,0,0],[0,0,-1,1],[0,1,-1,0],[-1,0,0,1]] // ori = 2
    ];

    
var y=new Array(4); // partitions
// variables for puzzle calculation. they are set by process() 
var size1; var size2;
var size; // size of young diagram/puzzle (the ones currently processed, not! currently displayed) 
var edge; // triple array of edge states. edge[i=0...size+2,j=0..size+2,ori=0..2] (i+j<=size+2): 0=undefined, 1=-, 2=+, 3=0, 4=0bar, 5 & 6 = extra undegen
var doublePuzzle=false;
// or by initPuzzle()
var t;
var npuzzles;

var edgebak; // for undo in manual

var quadedge;

function initPuzzle() // start the creation of all puzzles with given constraints
{
    // make a stack of edges that are not fixed yet
    varedge=new Array();
    for (i=1; i<=size+1; i++)
	for (j=1; doublePuzzle ? j<=size+1 : j<=size+1-i; j++)
	    for (k=0; k<3; k++)
		if ((k==1 || j<size+1) && (k==0 || i<size+1)) // only for doublePuzzle really
		    if (edge[i][j][k]===0)
			varedge.push([i,j,k]);


    t=0; // where in the stack of var edges we are

    npuzzles=0; // number of created puzzles

    // create the array of possible edges. first list options for up/down pointing triangles. usual ordering: SE,SW,E
    // closely related to tritype structured differently

    var uptriedge=[[1,1,1],[2,2,2],[1,2,3],[2,3,1],[3,1,2]]; 
    var downtriedge=[[1,1,1],[2,2,2],[1,2,3],[2,3,1],[3,1,2]]; 

    if (document.getElementById("nondeg").checked)
    {
	uptriedge.push([1,3,5]);
	downtriedge.push([1,3,5]);
	uptriedge.push([3,2,6]);
	downtriedge.push([3,2,6]);
    }
    if (document.getElementById("equiv").checked)
    {
	uptriedge.push([2,1,4]);
	downtriedge.push([2,1,4]);
    }
    if (document.getElementById("equiv2").checked)
    {
	uptriedge.push([4,2,1]);
	downtriedge.push([4,2,1]);
    }
    if (document.getElementById("equiv3").checked)
    {
	uptriedge.push([1,4,2]);
	downtriedge.push([1,4,2]);
    }

    if (document.getElementById("K").checked)
    {
	uptriedge.push([3,3,3]);
    }

    if (document.getElementById("Kinv").checked)
    {
	downtriedge.push([3,3,3]);
    }

    // need to combine the two triangles into a bigger array which depends on the orientation of the edge.......
    quadedge=[nestedArray(5,numedges+1,0),nestedArray(5,numedges+1,0),nestedArray(5,numedges+1,0)];

    // now use zero as a wild card
    for (i=0; i<uptriedge.length; i++)
	for (j=0; j<downtriedge.length; j++)
    {
	if (uptriedge[i][0]==downtriedge[j][0])
	    for (k=0; k<32; k++)
		quadedge[0][(k&1)*uptriedge[i][0]][((k>>1)&1)*uptriedge[i][2]][((k>>2)&1)*uptriedge[i][1]][((k>>3)&1)*downtriedge[j][2]][((k>>4)&1)*downtriedge[j][1]]++;
	if (uptriedge[i][1]==downtriedge[j][1])
	    for (k=0; k<32; k++)
		quadedge[1][(k&1)*uptriedge[i][1]][((k>>1)&1)*uptriedge[i][0]][((k>>2)&1)*uptriedge[i][2]][((k>>3)&1)*downtriedge[j][0]][((k>>4)&1)*downtriedge[j][2]]++;
	if (uptriedge[i][2]==downtriedge[j][2])
	    for (k=0; k<32; k++)
		quadedge[2][(k&1)*uptriedge[i][2]][((k>>1)&1)*uptriedge[i][1]][((k>>2)&1)*uptriedge[i][0]][((k>>3)&1)*downtriedge[j][1]][((k>>4)&1)*downtriedge[j][0]]++;
    }
    
}

var parts;

function makePuzzle() // one step in the making of a puzzle
{ // returns -2 if finished w/ all puzzles, -1 if found a new one, 0 if backtracked, 1 if added one tile
    var i,j,k,l;

    function findnext(i,j,k,l) // used internally by makePuzzle: sets a new edge if possible, or unset it if not
    {
	var lmax;
	if (k==2)
	{
	    if (doublePuzzle || i+j<size+1) lmax=numedges; else lmax=2; // whether boundary edge or not
	    while (l<=lmax && quadedge[2][l][edge[i][j][1]][edge[i][j][0]][edge[i][j+1][1]][edge[i+1][j][0]]==0) l++;
	}
	else if (k==1)
	{
	    if (j>1 && j<size+1) lmax=numedges; else lmax=2;
	    while (l<=lmax && quadedge[1][l][edge[i][j][0]][edge[i][j][2]][edge[i+1][j-1][0]][edge[i][j-1][2]]==0) l++;
	}
	else if (k==0)
	{
	    if (i>1 && i<size+1) lmax=numedges; else lmax=2;
	    while (l<=lmax && quadedge[0][l][edge[i][j][2]][edge[i][j][1]][edge[i-1][j][2]][edge[i-1][j+1][1]]==0) l++;
	}
	if  (l<=lmax) { edge[i][j][k]=l; return true; } else { edge[i][j][k]=0; return false; }
    }

    // we want to fix a new edge: find which has fewest possibilities
    var tmin; var c; var cmin=1000000;

    for (tt=t; tt<varedge.length; tt++)
    {
	i=varedge[tt][0]; j=varedge[tt][1]; k=varedge[tt][2];
	if (k==2)
	    c=quadedge[2][0][edge[i][j][1]][edge[i][j][0]][edge[i][j+1][1]][edge[i+1][j][0]]; // edge[i][j][2] SHOULD be zero!
	else if (k==1)
	    c=quadedge[1][0][edge[i][j][0]][edge[i][j][2]][edge[i+1][j-1][0]][edge[i][j-1][2]]; // edge[i][j][1] SHOULD be zero
	else if (k==0)
	    c=quadedge[0][0][edge[i][j][2]][edge[i][j][1]][edge[i-1][j][2]][edge[i-1][j+1][1]]; // edge[i][j][0] SHOULD be zero
	if (c<cmin) { cmin=c; tmin=tt; if (c==0) break; }
    }
    if (t==varedge.length || cmin==0 || !findnext(i=varedge[tmin][0],j=varedge[tmin][1],k=varedge[tmin][2],1))
    {
	// backtracking
	while (t>0)
	{
	    i=varedge[t-1][0]; j=varedge[t-1][1]; k=varedge[t-1][2];
	    if (findnext(i,j,k,edge[i][j][k]+1))
		break;
	    t--;
	}
	if (t==0) return -2; // the end: can't backtrack any further
	else if (t<varedge.length) return 0; // successful backtrack
    }
    else
    { // mark the new edge as set
	// permute tmin and t, increase t
	varedge[tmin][0]=varedge[t][0]; varedge[tmin][1]=varedge[t][1]; varedge[tmin][2]=varedge[t][2];
	varedge[t][0]=i; varedge[t][1]=j; varedge[t][2]=k; t++;
    }
    if (t==varedge.length) 
    { // full puzzle: should compute the 3/4 partitions (and check they're in the right box)
	var y1p,y2p,y3p,y4p;
	y1p=[];
	for (i=1; i<=size; i++)
	    if (edge[i][1][1]==1) y1p.push(size-i-size1+1+y1p.length);
	if (y1p.length!=size1) return 1;
	while (y1p.length>0 && y1p[y1p.length-1]==0) y1p.pop();

	y2p=[];
	for (i=size; i>=1; i--)
	    if (edge[1][i][0]==1) y2p.push(i-size1+y2p.length);
	if (y2p.length!=size1) return 1;
	while (y2p.length>0 && y2p[y2p.length-1]==0) y2p.pop();

	if (doublePuzzle)
	{
	    y3p=[];
	    for (i=size; i>=1; i--)
		if (edge[i][size+1][1]==1) y3p.push(i-size1+y3p.length);
	    if (y3p.length!=size1) return 1;
	    while (y3p.length>0 && y3p[y3p.length-1]==0) y3p.pop();

	    y4p=[];
	    for (i=1; i<=size; i++)
		if (edge[size+1][i][0]==1) y4p.push(size-i-size1+1+y4p.length);
	    if (y4p.length!=size1) return 1;
	    while (y4p.length>0 && y4p[y4p.length-1]==0) y4p.pop();	    
	    parts=[size1,size2,y1p,y2p,y3p,y4p];
	    return -1;
	}
	else
	{
	    y3p=[];
	    for (i=1; i<=size; i++)
		if (edge[size+1-i][i][2]==1) y3p.push(size-i-size1+1+y3p.length);
	    if (y3p.length!=size1) return 1;
	    while (y3p.length>0 && y3p[y3p.length-1]==0) y3p.pop();
	    parts=[size1,size2,y1p,y2p,y3p]; // this is the info "parts" that will be contained in button.state for "update partitions from puzzle"
	    return -1;
	}
    }
    return 1; // added one tile, nothing special happened
}

function loadPuzzle() // load an existing puzzle. called by clicking on a button
{
    makeCurrent(this);
}

var ncoords;
var coords;
var vind;
var midpt;

function initCoords(center)
{
    var i,j,framelen;
    // first make a big empty table of vertex indices
    vind=new Array(size+2); for (i=0; i<=size+1; i++) vind[i]=new Array(size+2); // vind[i][j] === undefined. indices = matrix style 1..size+1

    // arbitrarily set the coordinate of one vertex
    if (center) // if coordinates are gonna be centered we don't worry too much
    {
	i=1; j=1; while ((i<=size)&&(edge[i][j][0]==0)&&(edge[i][j][1]==0)) { j++; if (j>size) {j=1; i++;} } // find a vertex adjacent to an occupied edge
	vind[i][j]=0;
	coords=[0,0,0,0]; ncoords=1; // ncoords=coords.length/4;
    }
    else
    { // if not, it's harder: we're gonna use the frame
	if (doublePuzzle)
	{
	    coords=[
		size1/2,-size1/2,size2/2,-size2/2,
		-size1/2,-size1/2,size2/2,-size2/2,
		-size1/2,-size1/2,-size2/2,-size2/2,
		-size1/2,size1/2,-size2/2,-size2/2,
		-size1/2,size1/2,-size2/2,size2/2,
		size1/2,size1/2,-size2/2,size2/2,
		size1/2,size1/2,size2/2,size2/2,
		size1/2,-size1/2,size2/2,size2/2
	    ];
	    vind[1][1]=2;
	    vind[1][size+1]=4;
	    vind[size+1][size+1]=6;
	    vind[size+1][1]=0;
	}
	else
	{
	    coords=[
		2*size1/3,-size1/3,2*size2/3,-size2/3,
		-size1/3,-size1/3,2*size2/3,-size2/3,
		-size1/3,-size1/3,-size2/3,-size2/3,
		-size1/3,2*size1/3,-size2/3,-size2/3,
		-size1/3,2*size1/3,-size2/3,2*size2/3,
		2*size1/3,-size1/3,-size2/3,2*size2/3
	    ];
	    vind[1][1]=2;
	    vind[1][size+1]=4;
	    vind[size+1][1]=0;
	}
	// coords of arrows/labels too
	framelen=ncoords=coords.length/4;
	for (j=0; j<framelen/2; j++)
	{
	    // arrow body
	    for (i=0; i<4; i++)
		coords.push(coords[4*(j*2+1)+i]+0.1*coords[4*((j*2+2)%framelen)+i]);
	    //	coords.push(0.65*coords[4*(j*2)+i]+0.5*coords[4*((j*2+2)%framelen)+i]);
	    for (i=0; i<4; i++)
		coords.push(coords[4*(j*2+1)+i]+0.1*coords[4*(j*2)+i]);
	    //  coords.push(0.5*coords[4*(j*2)+i]+0.65*coords[4*((j*2+2)%framelen)+i]);
	    // now determine the tip of the arrow: should depend on how one reads diagrams. reverse tip
	    for (i=0; i<4; i++)
		coords.push(coords[4*(j*2+1)+i]+0.05*coords[4*(j*2)+i]);
	    //
	    for (i=0; i<4; i++)
		coords.push(coords[4*(j*2+1)+i]+0.05*coords[4*((j*2+2)%framelen)+i]+0.1*coords[4*(j*2)+i]); 
	    //
	    // default tip
	    for (i=0; i<4; i++)
		coords.push(coords[4*(j*2+1)+i]+0.05*coords[4*((j*2+2)%framelen)+i]);
	    //  coords.push(0.6*coords[4*(j*2)+i]+0.5*coords[4*((j*2+2)%framelen)+i]);
	    for (i=0; i<4; i++)
		coords.push(coords[4*(j*2+1)+i]+0.05*coords[4*(j*2)+i]+0.1*coords[4*((j*2+2)%framelen)+i]);
	    //	coords.push(0.65*coords[4*(j*2)+i]+0.55*coords[4*((j*2+2)%framelen)+i]);
	    // location of label
	    for (i=0; i<4; i++)
		coords.push(coords[4*(j*2+1)+i]+0.15*coords[4*(j*2)+i]+0.15*coords[4*((j*2+2)%framelen)+i]);
	    //  coords.push(0.5*coords[4*(j*2)+i]+0.5*coords[4*((j*2+2)%framelen)+i]+0.15*coords[4*(j*2)+i]+0.15*coords[4*((j*2+2)%framelen)+i]);
	    //
	    ncoords+=7;
	}
    }
    // empty as well the index array for midpoints (and little arrows)
    midpt={};
}

function updateCoords() // try to find new coordinates of vertices using known edges
{
    var ncoords0; //var count=0;
    do {
	ncoords0=ncoords;
	for (i=1; i<=size+1; i++)
	    for (j=1; j<=size+2; j++)
		if (vind[i][j]===undefined)
	{
	    vind[i][j]=ncoords; ncoords++; // just in case...
	    if (edge[i][j-1][0]>0 && (k=vind[i][j-1])!==undefined) { for (l=0; l<4; l++) coords.push(coords[k*4+l]+shft[0][edge[i][j-1][0]-1][l]); }
	    else if (edge[i-1][j][1]>0 && (k=vind[i-1][j])!==undefined) { for (l=0; l<4; l++) coords.push(coords[k*4+l]+shft[1][edge[i-1][j][1]-1][l]); }
	    else if (edge[i][j-1][2]>0 && (k=vind[i+1][j-1])!==undefined) { for (l=0; l<4; l++) coords.push(coords[k*4+l]+shft[2][edge[i][j-1][2]-1][l]); }
	    else if (edge[i-1][j][2]>0 && (k=vind[i-1][j+1])!==undefined) { for (l=0; l<4; l++) coords.push(coords[k*4+l]-shft[2][edge[i-1][j][2]-1][l]); }
	    else if (edge[i][j][0]>0 && (k=vind[i][j+1])!==undefined) { for (l=0; l<4; l++) coords.push(coords[k*4+l]-shft[0][edge[i][j][0]-1][l]); }
	    else if (edge[i][j][1]>0 && (k=vind[i+1][j])!==undefined) { for (l=0; l<4; l++) coords.push(coords[k*4+l]-shft[1][edge[i][j][1]-1][l]); }
	    else { ncoords--; vind[i][j]=undefined; } // actually, never mind...
	}
    }
    while (ncoords>ncoords0);
}

function buildUrl() // build an url to call the associativity thing
{
    var url="../assoc/?n="+size+"&hcol=";
    for (i=1; i<=size+1; i++)
	for (j=1; j<=size; j++)
	    if (i+j<=size+1)
		url+=(edge[i][j][0])+","; else url+=((edge[i][j][0]+2)%4)+",";
    url+="&vcol=";
    for (i=1; i<=size; i++)
	for (j=1; j<=size+1; j++)
	    if (i+j<=size+1)
		url+=((edge[i][j][1]%3)+1)+","; else url+=((1<<(edge[i][j][1]-1))-1)+",";
    
    return url;
}

function buildScene(graph,init,center) // convert a puzzle (array of edge states) into graphical data (graph)
{ // init means it's a new puzzle; center means center coordinates (used for display of elementary tiles)
    var edgelist;
    var div;
    var i,j,k,l,m;

    function makeArrow(c,c1,c2) // makes a little arrow for the loop view
    {
	var i,j;
	edgelist[3].push(c1,c2);
	if ((j=midpt[c+"/"+c1+"/"+c2])===undefined)
	    {
		/*
		let a1=new Array(4);
		let a2=new Array(4);
		let a3=new Array(4);
		*/
		var a1=new Array(4);
		var a2=new Array(4);
		var a3=new Array(4);
		for (i=0; i<4; i++)
		    {
			a1[i]=(coords[c1*4+i]+coords[c2*4+i])*0.42+coords[c*4+i]*0.16;
			a2[i]=(coords[c1*4+i]+coords[c2*4+i])*0.58-coords[c*4+i]*0.16;
			a3[i]=coords[c1*4+i]*0.42+coords[c2*4+i]*0.58;
		    }
		for (i=0; i<4; i++)
		    coords.push(a1[i]);
		for (i=0; i<4; i++)
		    coords.push(a2[i]);
		for (i=0; i<4; i++)
		    coords.push(a3[i]);
		j=midpt[c+"/"+c1+"/"+c2]=ncoords;
		ncoords+=3;
	    }
	edgelist[3].push(j,j+2);
	edgelist[3].push(j+1,j+2);
    }

    if (init) initCoords(center); // resets coordinates if new picture
    updateCoords();

    var avg;
    if (center) // calculate average
    {
	avg=[0,0,0,0];
	for (j=0; j<4; j++)
	{
	    for (i=0; i<ncoords; i++)
		avg[j]+=coords[4*i+j];
	    avg[j]/=ncoords;
	}
    }

    
    if (!center) // centered puzzles (tiles) don't have frames or arrows/labels
    {
	//	let framelen = doublePuzzle?8:6; // # vertices of the frame
	var framelen = doublePuzzle?8:6; // # vertices of the frame
	// draw the frame
	addGraph(graph,gl.LINE_LOOP,
	     Array.apply(null, Array(framelen)).map(function (element, index) { return index;}), // gross. a more elegant solution is Array.from(Array(framelen).keys())
	     8,[0,0,0,1],1); // lines, flag, black, thin

	// draw arrows/labels
	//	let msk=1024; let r=framelen;
	var msk=maxmask*2; var r=framelen;
	for (j=0; j<framelen/2; j++)
	{
	    addGraph(graph,gl.LINES,[r,r+1,r+1,r+2,r+1,r+3],16+msk,[0,0,0,1],1);
	    msk=2*msk;
	    addGraph(graph,gl.LINES,[r,r+1,r,r+4,r,r+5],16+msk,[0,0,0,1],1);
	    msk=2*msk;
	    addGraph(graph,gl.POINTS,[r+6],16,null,20.*size,textSampler(greek[j])); // last param = # of sampler.
	    r+=7;
	}
    }

    edgelist=new Array(); pointlist=new Array(); for (i=0; i<4; i++) pointlist[i]=new Array();
    pointtype=[[0,2,3,1],[1,0,3,2],[1,2,0,3]]; // to know in which color to draw the vertices depending on (orientation,edge state)
    var a,b;
    // for now: draw all edges labelled 1,2. could try to be more subtle.
    for (i=1; i<=size+1; i++) 
	for (j=1; j<=size+1; j++)
	    for (k=0; k<3; k++)
		if (edge[i][j][k]>0)
    {
	if (k==0) { a=vind[i][j]; b=vind[i][j+1]; } // ori 0
	else if (k==1) { a=vind[i][j]; b=vind[i+1][j]; } // ori 1
	else if (k==2) { a=vind[i+1][j]; b=vind[i][j+1]; } // ori 2  
	if (a!==undefined && b!==undefined)
	{
	    if (edge[i][j][k]<3) edgelist.push(a,b);
	    // midpoint
	    if ((m=midpt[a+"/"+b])===undefined) // lame hash table
		{
		    for (l=0; l<4; l++) coords.push((coords[4*a+l]+coords[4*b+l])/2);
		    m=midpt[a+"/"+b]=ncoords;
		    ncoords++;
		}
	    // if edge is on the boundary of drawn zone, add little point
	    if (edge[i][j][0]==0||edge[i][j][1]==0||edge[i][j][2]==0||((k==0)&&(edge[i-1][j+1][1]==0||edge[i-1][j][2]==0))||((k==1)&&(edge[i+1][j-1][0]==0||edge[i][j-1][2]==0))||((k==2)&&(edge[i+1][j][0]==0||edge[i][j+1][1]==0)))
		pointlist[pointtype[k][edge[i][j][k]-1]].push(m);
	    // edge labelling (traditional)
	    if (edge[i][j][k]<=3)
		addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],1024,[0,0,0,1],90,textSampler(edge[i][j][k]==3?10:edge[i][j][k]-1));
	    if (!center)
	    {
		// edge numbering (for honeycombs)
		if (edge[i][j][k]==1) // honeycomb (green)
		{
		    if (k==0)
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],256,[0,0,0,1],90,textSampler(Math.round(coords[4*a+3]-coords[4*vind[1][1]+3])));
		    else if (k==1)
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],256,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[size+1][1]+3]+coords[4*vind[size+1][1]+2]-(coords[4*a+3]+coords[4*a+2]))));
		    else
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],256,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[size+1][1]+2]-coords[4*a+2])));
		}
		else if (edge[i][j][k]==2) // dual honeycomb (red)
		{
		    if (k==0)
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],512,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[1][size+1]]+coords[4*vind[1][size+1]+1]-(coords[4*a]+coords[4*a+1]))));
		    else if (k==1)
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],512,[0,0,0,1],90,textSampler(Math.round(coords[4*a]-coords[4*vind[1][1]])));
		    else
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],512,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[1][size+1]+1]-coords[4*a+1])));
		}
/* needs fixing
		else if (edge[i][j][k]==3) // both honeycomb numberings
		{
		    if (k==0)
		    {
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],256,[0,0,0,1],90,textSampler(Math.round(coords[4*a+3]-coords[4*vind[1][1]+3])));
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],512,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[1][size+1]]+coords[4*vind[1][size+1]+1]-(coords[4*a]+coords[4*a+1]))));
		    }
		    else if (k==1)
		    {
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],256,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[size+1][1]+3]+coords[4*vind[size+1][1]+2]-(coords[4*a+3]+coords[4*a+2]))));
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],512,[0,0,0,1],90,textSampler(Math.round(coords[4*a]-coords[4*vind[1][1]])));
		    }
		    else
		    {
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],256,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[size+1][1]+2]-coords[4*a+2])));
			addGraph(graph,gl.POINTS,[midpt[a+"/"+b]],512,[0,0,0,1],90,textSampler(Math.round(coords[4*vind[1][size+1]+1]-coords[4*a+1])));
		    }
		}
*/
	    }
	}
    }
    addGraph(graph,gl.LINES,edgelist,0,[0,0,0,1],1); // lines, always draw, black, thin

    
    // just draw triangles according to edge states
    trilist=new Array(colors4d.length); for (i=0; i<colors4d.length; i++) trilist[i]=new Array();
    edgelist=new Array(linecolors4d.length); for (i=0; i<linecolors4d.length; i++) edgelist[i]=new Array(); // another edge list for midpoints
    for (i=1; i<=size; i++)
	for (j=1; j<=size; j++)
    {
	// first up-pointing triangle
	if ((k=vind[i][j])!==undefined && (l=vind[i+1][j])!==undefined && (m=vind[i][j+1])!==undefined && (c=tritype[edge[i][j][0]][edge[i][j][1]][edge[i][j][2]])>=0)
	{
	    trilist[c].push(k,l,m);
	    // midpt
	    switch(c) {
	    case 0: // green triangle
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]);
		makeArrow(m,midpt[k+"/"+m],midpt[l+"/"+m]);
		break;
	    case 1: // red triangle
		edgelist[1].push(midpt[k+"/"+m],midpt[l+"/"+m]);
		makeArrow(l,midpt[l+"/"+m],midpt[k+"/"+l]);
		break;
	    case 2: // various squares
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]);
		edgelist[1].push(midpt[k+"/"+l],midpt[k+"/"+m]);
		makeArrow(l,midpt[k+"/"+l],midpt[l+"/"+m]);
		if (!center)
		//tableau numbering
		addGraph(graph,gl.POINTS,[midpt[k+"/"+l]],64,[0,0.3,0,1],90,textSampler(Math.round(coords[4*k]-coords[4*vind[1][1]]+1))); // last param = # of sampler
		break;
	    case 3:
		edgelist[0].push(midpt[k+"/"+l],midpt[k+"/"+m]);
		edgelist[1].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		makeArrow(m,midpt[l+"/"+m],midpt[k+"/"+m]);
		if (!center)
		//tableau numbering
		addGraph(graph,gl.POINTS,[midpt[k+"/"+m]],128,[0.3,0,0,1],90,textSampler(Math.round(coords[4*k+3]-coords[4*vind[1][1]+3]+1))); // last param = # of sampler
		break;
	    case 4:
		makeArrow(k,midpt[k+"/"+m],midpt[k+"/"+l]); 
		break;
	    case 5: // various thin rhombi
		edgelist[0].push(midpt[k+"/"+m],midpt[l+"/"+m]);
		makeArrow(m,midpt[k+"/"+m],midpt[l+"/"+m]);
		makeArrow(k,midpt[k+"/"+m],midpt[k+"/"+l]);
		break;
	    case 6:
		edgelist[1].push(midpt[k+"/"+l],midpt[l+"/"+m]);
		makeArrow(l,midpt[l+"/"+m],midpt[k+"/"+l]);
		makeArrow(k,midpt[k+"/"+m],midpt[k+"/"+l]);
		break;
	    case 7:
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		break;
	    case 8: // k-tile
		edgelist[0].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		edgelist[2].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		makeArrow(k,midpt[k+"/"+l],midpt[k+"/"+m]); 
		break;
	    case 9:
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		edgelist[2].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		makeArrow(l,midpt[k+"/"+l],midpt[l+"/"+m]); 
		break;
	    case 10:
		edgelist[0].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		edgelist[2].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		makeArrow(m,midpt[l+"/"+m],midpt[k+"/"+m]); 
		break;		
	    }
	}
	// then down-pointing triangle
	if ((k=vind[i+1][j])!==undefined && (l=vind[i][j+1])!==undefined && (m=vind[i+1][j+1])!==undefined && (c=tritype[edge[i+1][j][0]][edge[i][j+1][1]][edge[i][j][2]])>=0)
	{
	    trilist[c].push(m,l,k); // so all triangles are "facing the same way". might be on the contrary a way for the shader to distinguish up from down pointing triangles
	    // midpt
	    switch(c) {
	    case 0:
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]);
		makeArrow(k,midpt[k+"/"+l],midpt[k+"/"+m]); 
		break;
	    case 1:
		edgelist[1].push(midpt[k+"/"+m],midpt[k+"/"+l]); 
		makeArrow(l,midpt[l+"/"+m],midpt[k+"/"+l]);
		break;
	    case 2:
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]);
		edgelist[1].push(midpt[l+"/"+m],midpt[k+"/"+m]);
		makeArrow(l,midpt[k+"/"+l],midpt[l+"/"+m]);
		break;
	    case 3:
		edgelist[0].push(midpt[k+"/"+m],midpt[l+"/"+m]);
		edgelist[1].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		makeArrow(k,midpt[k+"/"+m],midpt[k+"/"+l]); 
		break;
	    case 4:
		makeArrow(m,midpt[l+"/"+m],midpt[k+"/"+m]); 
		break;
	    case 5:
		edgelist[0].push(midpt[k+"/"+l],midpt[k+"/"+m]);
		makeArrow(m,midpt[l+"/"+m],midpt[k+"/"+m]);
		makeArrow(k,midpt[k+"/"+l],midpt[k+"/"+m]);
		break;		
	    case 6:
		edgelist[1].push(midpt[k+"/"+l],midpt[l+"/"+m]);
		makeArrow(m,midpt[l+"/"+m],midpt[k+"/"+m]);
		makeArrow(l,midpt[l+"/"+m],midpt[k+"/"+l]);
		break;
	    case 7:
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		break;
	    case 8:
		edgelist[0].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		edgelist[2].push(midpt[k+"/"+m],midpt[l+"/"+m]); 
		makeArrow(m,midpt[k+"/"+m],midpt[l+"/"+m]);
		break;
	    case 9:
		edgelist[0].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		edgelist[2].push(midpt[k+"/"+l],midpt[l+"/"+m]); 
		makeArrow(l,midpt[k+"/"+l],midpt[l+"/"+m]);
		break;
	    case 10:
		edgelist[0].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		edgelist[1].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		edgelist[2].push(midpt[k+"/"+l],midpt[k+"/"+m]); 
		makeArrow(k,midpt[k+"/"+m],midpt[k+"/"+l]);
		break;		
	    }
	}
    }
    // triangles
    for (i=0; i<colors4d.length; i++)
	addGraph(graph,gl.TRIANGLES,trilist[i],0,colors4d[i]);
    // lines
    for (i=0; i<linecolors4d.length; i++)
	addGraph(graph,gl.LINES,edgelist[i],1+i,linecolors4d[i],i==2 ? 6 : 4);
    // vertices
    pointcolors=[[0.5,0.5,1,1],[0,1,0,1],[1,0,0,1],[0.9,0.9,0,1]];
    for (var i=0; i<4; i++)
	addGraph(graph,gl.POINTS,pointlist[i],32,pointcolors[i],30,textSampler("*"));

    // now coordinate transformations    
    if (center) // center coordinates: not used for actual puzzles because of wobbling issue when going from one to next
    {
	for (j=0; j<4; j++)
	    for (i=0; i<ncoords; i++)
		coords[4*i+j]-=avg[j];
    }

    // all of below is now done by the shader
    /*
    // transform the coordinates to an orthonormal basis    
    var morth=
	[[1., 1./2., 0, 0], [0, sq3/2., 0, 0], [0, 0, 1., 1./2.], [0, 0, 0, sq3/2.]];    
    var v=new Array(4);
    for (j=0; j<ncoords; j++)
    {
	for (k=0; k<4; k++)
	    v[k]=coords[4*j+k];
	for (k=0; k<4; k++)
	{
	    coords[4*j+k]=0;
	    for (l=0; l<4; l++)
		coords[4*j+k]+=morth[k][l]*v[l];
	}
    }
    // finally, rescale them 
    var scale;
    if (doublePuzzle)
	scale=1.5/size;
    else
	scale=2.25/size;

    for (i=0; i<ncoords; i++)
	for (j=0; j<4; j++)
	    coords[4*i+j]*=scale;
*/

    // also record coordinates of centers of tileable edges in manual mode
    if (graph.manual)
	for (var ii=0; ii<tileable.length; ii++)
    {
	i=tileable[ii][0]; j=tileable[ii][1]; k=tileable[ii][2];
	{
	    if (k==0) { a=vind[i][j]; b=vind[i][j+1]; } // ori 0
	    else if (k==1) { a=vind[i][j]; b=vind[i+1][j]; } // ori 1
	    else if (k==2) { a=vind[i+1][j]; b=vind[i][j+1]; } // ori 2
	    tileable[ii][4]=[];
	    for (l=0; l<4; l++) tileable[ii][4].push(coords[l+4*midpt[a+"/"+b]]);
	}
    }
    
    // now load coord buffer
    addCoords(graph,coords);

    // set base scale
    if (doublePuzzle)
	graph.scale=1.5/size;
    else
	graph.scale=2.25/size;

    /*
    graph.size=size; // record the size just in case needed
    graph.doublepuzzle=doublepuzzle;
    */

    
    return graph;
}

function clearPuzzles()
{
    endAnim(); // just in case
    var div=document.getElementById('puzzles');
    while ((para=div.lastElementChild)!=div.firstElementChild) // ugly -> better criterion for puzzle list to be empty?
    {
	while ((but=para.firstElementChild)!==null)
	    if (but.onclick==loadPuzzle) destroyButton(but); else para.removeChild(but);
	div.removeChild(para);
    }
    drawScene(); // empty screen
    // TODO: reset canvas size to default?
}

function process() // called when one presses the button... "process"
{
    var i;

    if (!document.getElementById("y1toggle").checked && !document.getElementById("y2toggle").checked && !document.getElementById("y3toggle").checked && (!document.getElementById("double").checked || !document.getElementById("y4toggle").checked))
    {
	alert('Please specify at least one partition.');
	return;
    }

    size1=+document.getElementById("height").innerHTML;
    size2=+document.getElementById("width").innerHTML;
    size=size1+size2;

    // array of edge states. a global variable (eww) that will be used by initPuzzle/makePuzzle/buildScene
    edge=nestedArray(2,size+3,[0,0,0]);

    // make a new paragraph in the list of puzzles
    doublePuzzle=document.getElementById("double").checked;
    var div=document.getElementById('puzzles');
    var para=document.createElement('p');
    para.id="currentpara";

    // going to decode 3/4 young diagrams as boundary edges
    if (doublePuzzle)
	para.innerHTML+="(D)";

    if (document.getElementById("y1toggle").checked)
    {
	para.innerHTML+=" 1: ("+(y[0].get())+")";
	if (document.getElementById("y1comp").checked)
	{
	    para.innerHTML+="*";
	    y1p=y[0].complement().get_padded();
	}
	else
	    y1p=y[0].get_padded();
	for (i=1; i<=size; i++)
	    edge[i][1][1]=2;
	for (i=0; i<size1; i++)
	    edge[size-(y1p[i]+size1-1-i)][1][1]=1;
    }

    if (document.getElementById("y2toggle").checked)
    {
	para.innerHTML+=" 2: ("+(y[1].get())+")";
	if (document.getElementById("y2comp").checked)
	{
	    para.innerHTML+="*";
	    y2p=y[1].complement().get_padded();
	}
	else
	    y2p=y[1].get_padded();
	for (i=1; i<=size; i++)
	    edge[1][i][0]=2;
	for (i=0; i<size1; i++)
	    edge[1][1+y2p[i]+size1-1-i][0]=1;
    }
	
    if (document.getElementById("y3toggle").checked)
    {
	para.innerHTML+=" 3: ("+(y[2].get())+")";
	if (document.getElementById("y3comp").checked)
	{
	    para.innerHTML+="*";
	    y3p=y[2].complement().get_padded();
	}
	else
	    y3p=y[2].get_padded();
	if (doublePuzzle)
	{
	    for (i=1; i<=size; i++)
		edge[i][size+1][1]=2;
	    for (i=0; i<size1; i++)
		edge[1+y3p[i]+size1-1-i][size+1][1]=1;
	}
	else
	{
	    for (i=1; i<=size; i++)
		edge[size+1-i][i][2]=2;
	    for (i=0; i<size1; i++)
		edge[1+y3p[i]+size1-1-i][size-(y3p[i]+size1-1-i)][2]=1;
	}
    }

    if (doublePuzzle && document.getElementById("y4toggle").checked)
    {
	para.innerHTML+=" 4: ("+(y[3].get())+")";
	if (document.getElementById("y4comp").checked)
	{
	    para.innerHTML+="*";
	    y4p=y[3].complement().get_padded();
	}
	else
	    y4p=y[3].get_padded();
	for (i=1; i<=size; i++)
	    edge[size+1][i][0]=2;
	for (i=0; i<size1; i++)
	    edge[size+1][size-(y4p[i]+size1-1-i)][0]=1;
    }

    para.innerHTML+=" ";
    if (document.getElementById("K").checked)
	para.innerHTML+=" K";
    if (document.getElementById("Kinv").checked)
	para.innerHTML+=" K2";
    if (document.getElementById("nondeg").checked)
	para.innerHTML+=" N";
    if (document.getElementById("equiv").checked)
	para.innerHTML+=" E";
    if (document.getElementById("equiv2").checked)
	para.innerHTML+=" E2";
    if (document.getElementById("equiv3").checked)
	para.innerHTML+=" E3";

    para.innerHTML+=" ";
    div.appendChild(para); // a little text at the beginning of the list of puzzle buttons
  
    initPuzzle(); // start the puzzle making process

    // create a template picture: useful for understanding if we got the boundary conditions right
//    para.innerHTML+=" "; // can't do that, would recreate button above, making it inactive...

    if (document.getElementById("editortoggle").checked) // if in manual mode
    {
	// remove current manual paragraph
	var oldpara=document.getElementById("manualpara");
	if (oldpara)
	{
	    /*
	    deleteBuffers(oldpara.lastElementChild.state);
	    div.removeChild(oldpara);
	    */
	    oldpara.lastElementChild.state.manual=false; // don't delete -- just tag it as noneditable
	    oldpara.lastElementChild.innerHTML="&empty;";
	    oldpara.removeAttribute("id");
	}
	// first create a list of possible slots to insert a tile.
	createTileable();
	//
	var but=createButton("M",buildScene({manual:true,select:-1},true)); // manual mode. select: which tile is selected in manual mode. <0 = none
	makeCurrent(but);

	// tag the paragraph as manual -- ultimately, to avoid multiple manual puzzles
	para.id="manualpara";

	var submit=document.getElementById("submit");
	submit.innerHTML="Complete"; // pressing on the button again will go back to non-manual mode
	submit.onclick=complete;

	return;
    }

    // normal mode
    createButton("&empty;",buildScene({},true));
    startAnim();
}

function startAnim()
{
    var submit=document.getElementById("submit");
    // start the animation
    shortenAnimFlag=false;
    var pd=processDelay();
    if (pd>0)
    {
	submit.innerHTML="Finish"; // pressing on the button again will shorten animation (like speed = 11)
	submit.onclick=shortenAnim;
	makeCurrent(createButton("*",buildScene({},true))); // make a new button which is currently displayed with empty corresponding puzzle
    }
    else
    {
	submit.innerHTML="Abort"; // pressing on the button again will abort
	submit.onclick=endAnim;
    }
    processAnimFlag=true;
    setTimeout(processAnimFunc, pd);
}

function complete()
{
    var para=document.getElementById("manualpara");
    if (!para) return ;
    para.id="currentpara";
    var current=document.getElementById('current');
    if (current===null) return;
    current.innerHTML="&empty;";
    var graph=current.state;
    if (!graph) return;
    graph.manual=false;
    initPuzzle();
    startAnim();
}

// icon. global variable = only one on the screen at at time
var iconangle=0;
function createIcon()
{
    icon=document.createElement('canvas');
    icon.id="icon";
    icon.width=10; icon.height=10;
}

function animateIcon()
{
    if (icon.getContext)
    {
	var iconangle2=iconangle+Math.PI;
 	ctx = icon.getContext('2d');
	ctx.fillStyle="black";
	ctx.beginPath();
	ctx.arc(icon.width/2,icon.height/2,5,iconangle,iconangle2);
	ctx.fill();
	ctx.fillStyle="white";
	ctx.beginPath();
	ctx.arc(icon.width/2,icon.height/2,5,iconangle2,iconangle);
	ctx.fill();
    }
    else alert("Could not create icon");
    iconangle+=0.1;
}

/*
// fancier icon
var iconshades=6;
function animateIcon()
{
    if (icon.getContext)
    {
	var iconangle1=iconangle; var iconangle2,col;
	var icondangle=2*Math.PI/(iconshades+1);
 	ctx = icon.getContext('2d');
	for (var i=0; i<=iconshades; i++)
	{
	    col=Math.floor(i/iconshades*255);
	    ctx.fillStyle="rgb("+col+","+col+","+col+")";
	    ctx.beginPath();
	    ctx.moveTo(icon.width/2,icon.height/2);
	    iconangle2=iconangle1+icondangle;
	    ctx.arc(icon.width/2,icon.height/2,5,iconangle1,iconangle2);
	    iconangle1=iconangle2;
	    ctx.fill();
	}
    }
    else alert("Could not create icon");
    iconangle+=0.1;
}
*/

//keyboards functions
function handleKeyDown(event)
{
    var active=document.activeElement;
    if (active!=document.body && active.onclick!=loadPuzzle) return true;

    // we allow arrows when playing with puzzle buttons
    var key=event.keyCode; 
    if (key == 37) // <-
    {
	if ((but=document.getElementById("current")) && (but.previousElementSibling !== null))
	{
	    if (active.id=='current') but.previousElementSibling.focus(); // annoying cause possibly scrolls the window. remove?
	    makeCurrent(but.previousElementSibling);
	}
    }
    else if (key == 39) // ->
    {
	if ((but=document.getElementById("current")) && (but.nextElementSibling !== null))
	{
	    if (active.id=='current') but.nextElementSibling.focus();
	    makeCurrent(but.nextElementSibling);
	}
    }
    else if (key == 38) // up
    {
	if ((but=document.getElementById("current")) && (but.parentElement.previousSibling !== null) && (but.parentElement.previousSibling.firstElementChild !== null) && (but.parentElement.previousSibling.firstElementChild.innerHTML.length == 1)) //lame
	{
	    if (active.id=='current') but.parentElement.previousSibling.firstElementChild.focus();
	    makeCurrent(but.parentElement.previousSibling.firstElementChild);
	}	
    }
    else if (key == 40) // down
    {
	if ((but=document.getElementById("current")) && (but.parentElement.nextSibling !== null) && (but.parentElement.nextSibling.firstElementChild !== null) && (but.parentElement.nextSibling.firstElementChild.innerHTML.length == 1))
	{
	    if (active.id=='current') but.parentElement.nextSibling.firstElementChild.focus();
	    makeCurrent(but.parentElement.nextSibling.firstElementChild);
	}
    }

    if (active!=document.body) return true; // for the rest, only if nothing is focused do we let keys work

    if (key == 32) // space 
    {
	toggleAnimation();
    }
    else if (key==13) // enter
    {
	rotate90();
    }
    else if ((key>=48)&&(key<58)) // digits
	presetView(key-48);
    // next, debugging options

    else if (key==68) // 'd'
	{
	    document.getElementById('debug').removeAttribute('hidden');
	    if (document.getElementById('debug').innerHTML=="")
		dump();
	    else
		document.getElementById('debug').innerHTML="";
	}
    else if (key==71) // 'g' -- green paths
	toggleLine(1);
    else if (key==82) // 'r' -- red paths
	toggleLine(2);
    else if (key==76) // 'l' -- loops
	toggleLine(4);
    else if (key==70) // 'f' -- frame
	toggleLine(8);
    else if (key==65) // 'a' -- arrows
	toggleLine(16);
    else if (key==80) // 'p' -- points
	toggleLine(32);
    else return true;
    return false; // PREVENTS DEFAULT BEHAVIOR!
}


function toggleLine(flag) // toggling from keyboard
{
    document.getElementById('check'+flag).onclick();
    drawScene();
}


// mouse functions
var mouseDown = false;
var mouseX = null;
var mouseY = null;

var rightButton=2; // at least that's the default
var middleButton=1;
var leftButton=0;

function handleMouseDown(event) 
{
    var x=event.layerX;
    var y=event.layerY;
    
    document.activeElement.blur();

    var current=document.getElementById('current');
    if (current===null) return false;
    var graph=current.state;
    if (!graph) return false;

    if (event.button==rightButton)
    {
	mouseDown = true; // preparing for 3d drag with mouse
	mouseX = x;
	mouseY = y;
	if (graph.manual)
	{
	    graph.select=-1; // deselect
	    drawScene(); // just in case selection indicated (e.g. mouse pointer).
	}
	return false;
    }
    else if (event.button==leftButton)
    {
	if (graph.manual)
	{
	if (y>0.9*canvas.height) // TEMP. eventually tiles will be moved elsewhere
	{ // we've decided to select another tile
	    var sel=Math.floor(x/canvas.width*tiles.length);
	    if (sel!=graph.select)
	    {
		graph.select=sel;
	    }
	    else
	    {
		graph.select=-1;
	    }
	    mouseX = x;
	    mouseY = y;
	    drawScene(); // just in case selection indicated. e.g. move pointer.
	    return false;
	}
	// select>=0, means we have selected a tile. then mouse click means something different
	// a bit painful: we're gonna go thru all tileable edges and see if one isn't too far...
	var c,i,j,k,l,ii,jj,kk;
	for (l=0; l<tileable.length; l++)
	{
	    c=conv4d2d(tileable[l][4]); // 2d coords of that edge
	    // should we compare in absolute or relative units? relative 
	    if ((c[0]-x)*(c[0]-x)+(c[1]-y)*(c[1]-y)>200000/size/size) continue; // exact distance is empirical, not so important, just eliminates obvious mismatches
	    // potential candidate: now does the tile fit?
	    i=tileable[l][0]; j=tileable[l][1]; k=tileable[l][2];
	    if (tileable[l][3]==0) // this info tells us which of the 2 neighboring triangles is tileable
	    {
		// triangle pointing up
		if (graph.select==8) continue; // doesn't fit
		if (graph.select==9) // shield pointing up
		{// complicated, can fit in 3 ways...
		    // first, find which way it fits (can only be 1 at most)
		    var f;
		    for (f=2; f<=4; f++)
		    {
			kk=0; while ((kk<3)&&((edge[i][j][kk]==0)||(edge[i][j][kk]==tiles0[f][kk]))) kk++;
			if (kk==3) break;
		    }
		    if (f>4) continue;
		    // found one; now check other 3 triangles fit as well (well, only need to check outer ones)
		    // determine location (top vertex)
		    if (f==2) { ii=i; jj=j-1;} else if (f==3) { ii=i-1; jj=j; } else { ii=i; jj=j; }
		    // redo the 3, actually
		    for (f=2; f<=4; f++)
		    {
			if (f==2) { i=ii; j=jj+1;} else if (f==3) { i=ii+1; j=jj; } else { i=ii; j=jj; }
			kk=0; while ((kk<3)&&((edge[i][j][kk]==0)||(edge[i][j][kk]==tiles0[f][kk]))) kk++;		
			if (kk<3) break;
		    }
		    if (f<=4) continue; // this time *all* must fit!
		    // match
		    edgebak=edge.clone(); //backup
		    for (f=2; f<=4; f++)
		    {
			if (f==2) { i=ii; j=jj+1;} else if (f==3) { i=ii+1; j=jj; } else { i=ii; j=jj; }
			for (kk=0; kk<3; kk++) edge[i][j][kk]=tiles0[f][kk];
		    }
		    v=[[ii,jj],[ii,jj+1],[ii,jj+2],[ii+1,jj],[ii+1,jj+1],[ii+2,jj]];
		}
		else
		{
		    kk=0; while ((kk<3)&&((edge[i][j][kk]==0)||(edge[i][j][kk]==tiles0[graph.select][kk]))) kk++;
		    if (kk<3) continue;
		    // we've got a match
		    if (graph.select<=1) // triangle: end of story
		    {
			edgebak=edge.clone(); //backup
			for (kk=0; kk<3; kk++) edge[i][j][kk]=tiles0[graph.select][kk];
			v=[[i,j+1],[i+1,j]]; // !!! because at the moment two triangles are glued together in pointer. may be temp
//			v=[[i,j],[i,j+1],[i+1,j]];
		    }
		    else // lozenge
		    {
			if ((graph.select==2)||(graph.select==6))
			{
			    ii=i; jj=j-1;
			}
			else if ((graph.select==3)||(graph.select==5))
			{
			    ii=i-1; jj=j;
			}
			else
			{
			    ii=i; jj=j;
		    }
			kk=0; while ((kk<3)&&((edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==0)||(edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==tiles0[graph.select][kk]))) kk++;
			if (kk<3) continue;
			edgebak=edge.clone(); //backup
			for (kk=0; kk<3; kk++) edge[i][j][kk]=tiles0[graph.select][kk];
			for (kk=0; kk<3; kk++) edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]=tiles0[graph.select][kk];
			v=[[i,j],[i,j+1],[i+1,j],[2*ii-i+1,2*jj-j+1]];
		    }
		}
	    }
	    else
	    {
		// triangle pointing down
		if (k==0) { ii=i-1; jj=j; } else if (k==1) { ii=i; jj=j-1; } else { ii=i; jj=j; }; // standardized coords of that down triangle
		if (graph.select==9) continue; //doesn't fit
		if (graph.select==8) // shield pointing down
		{ // complicated, can fit in several ways...
		    // first, find which way it fits (can only be 1 at most)
		    var f;
		    for (f=2; f<=4; f++)
		    {
			kk=0; while ((kk<3)&&((edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==0)||(edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==tiles0[f][kk]))) kk++;
			if (kk==3) break;
		    }
		    if (f>4) continue;
		    // found one; now check other 3 triangles fit as well (well, only need to check outer ones)
		    // determine location (top vertex)
		    if (f==2) { i=ii; j=jj+1;} else if (f==3) { i=ii+1; j=jj; } else { i=ii; j=jj; }
		    // redo the 3, actually
		    for (f=2; f<=4; f++)
		    {
			if (f==2) { ii=i; jj=j-1;} else if (f==3) { ii=i-1; jj=j; } else { ii=i; jj=j; }
			kk=0; while ((kk<3)&&((edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==0)||(edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==tiles0[f][kk]))) kk++;
			if (kk<3) break;
		    }
		    if (f<=4) continue; // this time *all* must fit!
		    // match
		    edgebak=edge.clone(); //backup
		    for (f=2; f<=4; f++)
		    {
			if (f==2) { ii=i; jj=j-1;} else if (f==3) { ii=i-1; jj=j; } else { ii=i; jj=j; }
			for (kk=0; kk<3; kk++) edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]=tiles0[f][kk];
		    }
		    v=[[i,j],[i+1,j-1],[i-1,j+1],[i+1,j],[i,j+1],[i+1,j+1]];
		}
		else
		{
		    kk=0; while ((kk<3)&&((edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==0)||(edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]==tiles0[graph.select][kk]))) kk++;
		    if (kk<3) continue;
		    // we've got a match
		    if (graph.select<=1) // triangle: end of story
		    {
			edgebak=edge.clone(); //backup
			for (kk=0; kk<3; kk++) edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]=tiles0[graph.select][kk];
			v=[[ii+1,jj],[ii,jj+1]]; // !!! because at the moment two triangles are glued together in pointer. may be temp
//			v=[[ii+1,jj],[ii,jj+1],[ii+1,jj+1]];
		    }
		    else if (graph.select<8) // lozenge
		    {
			if ((graph.select==2)||(graph.select==6))
			{
			    i=ii; j=jj+1;
			}
			else if ((graph.select==3)||(graph.select==5))
			{
			    i=ii+1; j=jj;
			}
			else
			{
			    i=ii; j=jj;
			}
			kk=0; while ((kk<3)&&((edge[i][j][kk]==0)||(edge[i][j][kk]==tiles0[graph.select][kk]))) kk++;
			if (kk<3) continue;
			edgebak=edge.clone(); //backup
			for (kk=0; kk<3; kk++) edge[ii+((kk==0)?1:0)][jj+((kk==1)?1:0)][kk]=tiles0[graph.select][kk];
			for (kk=0; kk<3; kk++) edge[i][j][kk]=tiles0[graph.select][kk];
			v=[[ii+1,jj],[ii,jj+1],[ii+1,jj+1],[2*i-ii,2*j-jj]];
		    }
		}
	    }
	    // found a good candidate: secondary check
	    updateCoords();
	    var avg=[0,0,0,0];
	    for (j=0; j<4; j++)
	    {
		for (i=0; i<v.length; i++)
		    avg[j]+=coords[vind[v[i][0]][v[i][1]]*4+j];
		avg[j]/=v.length;
	    }
	    var a=conv4d2d(avg);
	    if ((a[0]-x)*(a[0]-x)+(a[1]-y)*(a[1]-y)>40) // now we're serious: absolute distance = less than 6 pix
	    {
		edge=edgebak.clone(); // undo changes
		initCoords(); // we messed up the coords...
		continue;
	    }
	    // success, at last
	    createTileable(); // redo the list (could be optimized but who cares)
	    deleteBuffers(graph);
	    buildScene(graph,false);
	    drawScene();
	    break;
	}
	}
	else if (graph instanceof Array) // right button selects in summary
	{
	    if (!current.anim)
	    {
		var lst=current.parentElement.children;
		var n=lst.length-2; // first one being template, last one being summary
		var aspect=canvas.width/canvas.height;
		var aspectx,aspecty; if (aspect<1) { aspectx=1; aspecty=1/aspect; } else { aspectx=aspect; aspecty=1; }
		// n1*n2=n, n1/n2=aspect
		var n2=Math.round(Math.sqrt(n/aspect)); // number of rows
		if (n2>n) n2=n;
		if (n2>canvas.height/60) n2=Math.round(canvas.height/60); // arbitrary max
		var n1=Math.ceil(n/n2); // number of columns
		if (n1>canvas.width/60) n1=Math.round(canvas.width/60); // arbitrary max
		
		var selx=Math.floor(x/canvas.width*n1);
		var sely=Math.floor(y/canvas.height*n2); // not quite cause of 0.95...
		var sel=sely*n1+selx;
		if (sel<n)
		{
		    current.anim=true; current.sel=sel; current.t=0; current.dt=0.05;
		    setTimeout(panoramaAnimFunc, timerdelay2);
		    //		makeCurrent(lst[sel+1]);
		}
	    }
	}
	else // right button goes to last puzzle/summary
	{
	    var lst=current.parentElement.children;
	    var k=0; while (current!=lst[k]) k++; // lame
	    current=lst[lst.length-1];
	    if (k>0 && current.state instanceof Array) // if last puzzle is summary...
	    {
		current.anim=true;
		current.sel=k-1;
		current.t=1; current.dt=-0.05;
	    }
	    makeCurrent(current);
	}
    }
    else if (event.button==middleButton)
    {
	if (graph.manual&&(edgebak instanceof Array)) // undo
	{
	    var temp=edge;
	    edge=edgebak; // undo changes
	    edgebak=temp;
	    createTileable(); // redo the list (could be optimized but who cares)
	    deleteBuffers(graph);
	    buildScene(graph,true);
	    drawScene();
	}
    }
    return false; //! PREVENTS DEFAULT BEHAVIOR! this may have unexpected consequences, hence the blur thing
}

function panoramaAnimFunc()
{
    var current=document.getElementById('current');
    if ((current===null) || (!current.anim)) return false;
    if (current.t<0)
    {
	current.anim=false;
	drawScene();
    }
    else if (current.t>1)
    {
	current.anim=false;
	makeCurrent(current.parentElement.children[current.sel+1]);	
    }
    else
    {    
	drawScene();
	current.t+=current.dt;
	setTimeout(panoramaAnimFunc, timerdelay2);
    }
}

function handleMouseOut()
{
    mouseX=mouseY=null;
    var current=document.getElementById('current');
    if (current===null) return;
    var graph=current.state;
    if (graph===null) return;
    if (graph.manual&&(graph.select>=0)) drawScene();
}
    
function handleTouchStart(event)
{
    event.preventDefault(); // just in case...
    var touches = event.changedTouches;
    if (touches.length>0)
    {
/*	mouseDown = true;
	mouseX = touches[0].pageX-canvas.offsetLeft; // best I've found...
	mouseY = touches[0].pageY-canvas.offsetTop;
*/
	handleMouseDown( { layerX: touches[0].pageX-canvas.offsetLeft, layerY: touches[0].pageY-canvas.offsetTop, button: 0 } );
    }
}

function handleTouchEnd(event)
{
    mouseDown = false;
}

function handleMouseUp(event) 
{
    mouseDown = false;
}

function screen2sphere(x,y)
{
    var r=new Array(3);
    var mx=canvas.width;
    var my=canvas.height;
    
    r[0]=2.0 * x - mx;
    r[1]=my - 2.0 * y;
    if (mx<my) { r[0]/=mx; r[1]/=mx; } else { r[0]/=my; r[1]/=my; }

    var t=r[0]*r[0]+r[1]*r[1];
    r[0]/=1+0.25*t;
    r[1]/=1+0.25*t;
    r[2]=(1-0.25*t)/(1+0.25*t);

    return r;
}

function handleTouchMove(event)
{
    event.preventDefault(); // just in case...
    var touches = event.changedTouches;
    if (touches.length>0)
	handleMouseMove( { layerX: touches[0].pageX-canvas.offsetLeft, layerY: touches[0].pageY-canvas.offsetTop } );
/*    if (!mouseDown) return;
	doRotation(touches[0].pageX-canvas.offsetLeft,touches[0].pageY-canvas.offsetTop);
*/
    
}

function handleMouseMove(event) 
{
    var current=document.getElementById('current');
    if (current===null) return;
    var graph=current.state;
    if (graph===null) return;
    if (graph.manual&&(graph.select>=0))
    {
	mouseX=event.layerX;
	mouseY=event.layerY;
	drawScene();
    }
    if (!mouseDown) return;
    doRotation(event.layerX,event.layerY);
}

function doRotation(newX,newY)
{
    // rotation matrix computation
    mrot.rotate(screen2sphere(mouseX,mouseY),screen2sphere(newX,newY));

    drawScene();

    mouseX = newX;
    mouseY = newY;
}

//

function dump()
{
    var div=document.getElementById('debug');
    div.innerHTML+="{";
    for (var i=0; i<edge.length; i++)
    {
	div.innerHTML+="{";
	for (var j=0; j<edge[i].length; j++)
	{
			div.innerHTML+="{"+edge[i][j][0]+","+edge[i][j][1]+","+edge[i][j][2]+"}";
	    if (j<edge[i].length-1) div.innerHTML+=",";
	}
	if (i<edge.length-1) div.innerHTML+="},"; else div.innerHTML+="}},<br>";
    }
}

//

var tiles0=[[1,1,1],[2,2,2],[2,3,1],[3,1,2],[1,2,3],[4,2,1],[1,4,2],[2,1,4],[3,3,3]];

var tiles; // like a graph thing
function createTiles() // they're basically puzzles made of a single triangle
{
    size1=size2=2; size=4; // ouch! global variables!
    doublepuzzle=false;
    edge=nestedArray(2,size+3,[0,0,0]);

    tiles=[];
    
    edge=nestedArray(2,size+3,[0,0,0]);
    edge[1][1]=tiles0[0];
    edge[2][1][0]=tiles0[0][0];
    edge[1][2][1]=tiles0[0][1];
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[1][1]=tiles0[1];
    edge[2][1][0]=tiles0[1][0];
    edge[1][2][1]=tiles0[1][1];
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[1][2]=tiles0[2];
    edge[2][1][0]=tiles0[2][0];
    edge[1][2][1]=tiles0[2][1];
    edge[1][1][2]=tiles0[2][2];
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[2][1]=tiles0[3];
    edge[2][1][0]=tiles0[3][0];
    edge[1][2][1]=tiles0[3][1];
    edge[1][1][2]=tiles0[3][2];
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[1][1]=tiles0[4];
    edge[2][1][0]=tiles0[4][0];
    edge[1][2][1]=tiles0[4][1];
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[2][1]=tiles0[5];
    edge[2][1][0]=tiles0[5][0];
    edge[1][2][1]=tiles0[5][1];
    edge[1][1][2]=tiles0[5][2];
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[1][2]=tiles0[6];
    edge[2][1][0]=tiles0[6][0];
    edge[1][2][1]=tiles0[6][1];
    edge[1][1][2]=tiles0[6][2];
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[1][1]=tiles0[7];
    edge[2][1][0]=tiles0[7][0];
    edge[1][2][1]=tiles0[7][1];
    tiles.push(buildScene({},true,true));

    // last two are harder
    edge=nestedArray(2,size+3,[0,0,0]);
    edge[2][2]=tiles0[8];
    edge[1][3][1]=1;
    edge[1][2][2]=2;
    edge[3][1][0]=2;
    edge[2][1][2]=1;
    edge[3][2][0]=1;
    edge[2][3][1]=2;
    tiles.push(buildScene({},true,true));

    edge=nestedArray(2,size+3,[0,0,0]);
    edge[1][1]=tiles0[4];
    edge[1][2]=tiles0[2];
    edge[2][1]=tiles0[3];
    tiles.push(buildScene({},true,true));
}

var tileable=[]; // the list gives: coordinates of edges
function createTileable() // compute locations in global edge list where one can add tiles (for manual editing)
{
    var e,a;
    tileable=[];
    for (var i=1; i<=size; i++)
	for (var j=1; j<=size; j++)
	    if (doublePuzzle || (i+j<=size+1))
    {
	// up pointing
	e=edge[i][j];
	if ((e[0]==0)||(e[1]==0)||(e[2]==0))
	{
	    for (k=0; k<3; k++)
		if (e[k]>0)
		    tileable.push([i,j,k,0]);
	}
	if (doublePuzzle || (i+j<=size))
	{
	    // down pointing
	    e=[edge[i+1][j][0],edge[i][j+1][1],edge[i][j][2]];
	    if ((e[0]==0)||(e[1]==0)||(e[2]==0))
		for (k=0; k<3; k++)
		    if (e[k]>0)
			tileable.push([i+((k==0)?1:0),j+((k==1)?1:0),k,1]);
	}
	// in principle edges should never appear twice
    }
}


// interface functions

function setSize(which,value) 
{
    document.getElementById(which).innerHTML=value;
    resetYoung();
}

function setSpeed(value) 
{
    document.getElementById('speedtext').innerHTML= (value<10)? value : '&infin;';
}

function setIntens(value)
{
    drawScene();
}

function resetYoung(newy) // there should be a better way... if newy==null just keep existing values
{
    s1=+document.getElementById("height").innerHTML;
    s2=+document.getElementById("width").innerHTML;
    var yp;
    // young diagrams
    for (var i=0; i<4; i++)
    {
	if (newy) { if (newy.length>i) yp=newy[i]; else yp=[]; } else yp=y[i].get();
	var en=document.getElementById('y'+(i+1)+'canvas').enabled;
	var co=document.getElementById('y'+(i+1)+'comp').checked;
	destroyyoung('y'+(i+1));
	y[i]=inityoung('y'+(i+1),s1,s2,20,5,en,true,co);
	y[i].set(yp);
    }
}

function toggleDouble(val) // shouldn't be called directly
{
    document.getElementById("y4").hidden=!val;
}

function toggleKeyboard(val)
{
    if (val)
	document.onkeydown = handleKeyDown;
    else
	document.onkeydown = null;
}

function toggleMouseButtons(val)
{
    if (val)
    {
	rightButton=0;
	leftButton=2;
    }
    else
    {
	rightButton=2;
    	leftButton=0;
    }
}

function toggleComp(s) // shouldn't be called directly
{
    var young=document.getElementById(s).young;
    if (young)
	young.set(young.complement().get()); // eww    
    drawScene();
}

function togglePartition(s,b) // shouldn't be called directly
{
    var can,div,inp;
    if (can=document.getElementById(s+"canvas"))
    {
	can.enabled=b;
	can.redraw();
    }

    div=document.getElementById(s);
    if (b)
	div.style.color="";
    else
	div.style.color="gray";

    if (inp=document.getElementById(s+"src")) // shitty syntax of "attributes" (as opposed to properties)
    {
	if (b)
    	    inp.removeAttribute("disabled");
	else
	    inp.disabled="true";
    }
}


// to parse URL
function gup(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null; // if absent
    if (!results[2]) return ''; // if present but w/o assigned value
    return decodeURIComponent(results[2].replace(/\+/g, " ")); // if present and has a value
}

function bool(str) // converts null or string from url to boolean
{
    return (str!=='false')&&((str==="")||(+str!=0));
}

/*
function doresize()
{
//    document.getElementById("debug").innerHTML+="["+event.pageX+"/"+event.pageY+"]"
    var x=event.pageX; var y=event.pageY;
    if (x>100&&y>100)
    {
	canvas.width=event.pageX;
	canvas.height=event.pageY;
	precanvas.style.width=event.pageX;
	precanvas.style.height=event.pageY;
    }
    drawScene(); // should be called automatically by the resize listener, but sadly sometimes isn't...
}
*/

function updateparam(str,val)
{
    var el=document.getElementById(str);
    if (el.tagName=="INPUT") el.value=+val;
    else if ((el.classList[0]=="toggle-button")||(el.classList[0]=="complement")) el.update(bool(val)); // eww
    else el.innerHTML=val;
    return val;
}

var params=['height','width','speed','intens','double','K','Kinv','equiv','equiv2','equiv3','nondeg','y1comp','y2comp','y3comp','y4comp'];
var defaultparams=[2,2,4,1,false,false,false,false,false,false,false,false,false,false,false];
function parseURL()
{
    var val;
    for (i=0; i<params.length; i++)
    {
	val=gup(params[i]);
	if (val===null) val=defaultparams[i];
	updateparam(params[i],val);
    }
    size1=document.getElementById('heightrange').value=document.getElementById('height').innerHTML;
    size2=document.getElementById('widthrange').value=document.getElementById('width').innerHTML;
    setSpeed(document.getElementById('speed').value); // all this is crap, obviously

     // make the partitions
     for (i=1; i<=4; i++)
     {
	 y[i-1]=inityoung('y'+i,size1,size2,20,5,document.getElementById("y"+i+"toggle").checked,true,false); // ideally, wouldn't need this, would be like toggle buttons. TODO
	 if (updateparam('y'+i+'toggle',bool(gup('y'+i)))) // if a partition is given, it's automatically activated -- makes sense	 
	 {
	     y[i-1].set(gup('y'+i).split(","));
	     if (i==4) updateparam('double',true); // if 4th partition, double puzzle
	 } 
     }
}

function getparam(str)
{
    var el=document.getElementById(str);
    if (el.tagName=="INPUT") return el.value;
    else if ((el.classList[0]=="toggle-button")||(el.classList[0]=="complement")) return el.checked;
    else return el.innerHTML;
}

function updateURL()
{
    var url=document.location.origin+document.location.pathname;
    var flag=true;
    for (i=0; i<params.length; i++)
    {
	val=getparam(params[i]);
	if (val!=defaultparams[i])
	{
	    if (flag) { url+="?"; flag=false; } else url+="&";
	    url+=params[i]+"="+val;
	}
    }
    for (i=1; i<=4; i++)
        if (document.getElementById("y"+i+"toggle").checked)
	    url+="&y"+i+"="+y[i-1].get().toString();
    document.getElementById('url').value=url;
}
	
// start
function startScript() 
{
    precanvas = document.getElementById("precanvas");
    // get the webGL stuff working
    canvas = document.getElementById("webglcanvas");
    initGL();
    
    initShaders()
    
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST); 
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.blendFuncSeparate( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA,gl.ZERO, gl.ONE ); // ignore old alpha, take average of old and new rgb based on new alpha
    gl.enable(gl.BLEND);
    
    // init text (really, just pick the font)
    initText();
    // create the pretty icon for animation of puzzle building
    createIcon();
    // create a template of all tiles
    createTiles();
    
    // read options
    parseURL();
    updateURL();

     // view
     mrot=new Matrix(mrot0[+gup('view')]);

     // mask
     var mask=+gup('mask');
     i=1;
     while (i<=maxmask)
     {
	     updateparam("check"+i,mask&i);
	 i=2*i;
     }
     
     // interface
     canvas.oncontextmenu = function() { return false; }
     canvas.onmousedown = handleMouseDown;
     canvas.onmouseout = handleMouseOut;
     document.onmouseup = handleMouseUp;
     canvas.onmousemove = handleMouseMove;
     toggleKeyboard(document.getElementById('keyboard').checked);

     // touch interface
     canvas.addEventListener("touchstart",handleTouchStart,false);
     canvas.addEventListener("touchend",handleTouchEnd,false);
     canvas.addEventListener("touchcancel",handleTouchEnd,false);
     canvas.addEventListener("touchmove",handleTouchMove,false);

    //    window.addEventListener('resize',drawScene);
    //    addResizeListener(precanvas, drawScene); // unfortunately resize only works for windows... have to use this special package
    new ResizeObserver(drawScene).observe(precanvas);
     
     //lame... no onload for non-body elements
     document.getElementById("sizes").onclick();

     //
     if (bool(gup('process'))) process();
}
