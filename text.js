var text = [];
//for (var i=0; i<=9; i++) text.push(i); // tableau numbering. we could go beyond 9, of course
//text.push("λ","μ","ν","ρ"); // labels in utf8
// sadly the lpthe server is so #$@!%!$% that it doesn't recognize utf8
var greek = ["\u03bb","\u03bc","\u03bd","\u03c1"]; // labels in unicode
//text.push("10","01");

var font;

function initText()
{
    // determine the font
    var elem=document.getElementsByClassName('label')[0]; // get a random existing label;
    var style=window.getComputedStyle(elem,null);
    font=style.getPropertyValue('font-style')+" "+style.getPropertyValue('font-size')+" "+style.getPropertyValue('font-family');
}

function textSampler(txt)
{
    var i;
    if ((i=text.indexOf(txt))>=0) return i;
    
    // get the text stuff
    var textcanvas = document.getElementById('textcanvas');
    var ctx = textcanvas.getContext('2d');
    
    ctx.clearRect(0,0,textcanvas.width,textcanvas.height);
    if (txt!="*")
    {
	ctx.fillStyle = "#FFFFFF"; 	// This determines the text colour, it can take a hex value or rgba value (e.g. rgba(255,0,0,0.5))
	ctx.textAlign = "center";	// This determines the alignment of text, e.g. left, center, right
	ctx.textBaseline = "middle";	// This determines the baseline of the text, e.g. top, middle, bottom
	//ctx.font = "24px monospace";	// This determines the size of the text and the font family used
	ctx.font=font;
	ctx.fillText(txt,textcanvas.width/2,textcanvas.height/2);
    }
    else
    {
	// vertices = one more texture
	ctx.clearRect(0,0,textcanvas.width,textcanvas.height);
	ctx.beginPath();
	ctx.arc(textcanvas.width/2,textcanvas.height/2,8,0,2*Math.PI,false);
	ctx.fillStyle = "#FFFFFF";
	ctx.fill();
	ctx.lineWidth=2;
	ctx.strokeStyle="#000000";
	ctx.stroke();
    }


    //texture
    var texture=gl.createTexture();
    gl.activeTexture(gl.TEXTURE0+text.length); // ewww but apparently that's standard. texture is now last
    gl.bindTexture(gl.TEXTURE_2D, texture); // in principle don't need to bind all at all times -- it's okay as long as there are not more than 32 bound ones
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textcanvas); // This is the important line!
    gl.generateMipmap(gl.TEXTURE_2D);

    // added
    text.push(txt);
    return text.length-1;
}
