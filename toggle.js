var list =
    [
	['toggle-button', toggleButtonSetup, toggleButtonUpdate],
	['complement', compButtonSetup, compButtonUpdate]
    ];

function initToggle()
{
    var elt;
    for (var i=0; i<list.length; i++)
    {
	anchors = document.getElementsByClassName(list[i][0]);
	for (var j=0; j<anchors.length; j++)
	{
	    elt=anchors.item(j);
	    elt.setup=list[i][1];
	    if (elt.setup) elt.setup();
	    elt.updateInternal=list[i][2];
	
	    elt.update = function(val) // argument *must* be a boolean
	    {
		if (this.checked!==val)
		{
		    this.checked=val;
		    if (this.updateInternal) this.updateInternal();
		    if (this.onchange) this.onchange();
		}
		return this.checked;
	    }
	    
	    elt.onclick = function()
	    {
		return this.update(!this.checked);
	    }

	    // insert the ``checked'' field. several tricky points:
	    // (1) since element is in general not an input (in fact, it is required to be a span for several types), elt.checked is undefined and we need to use getAttribute
	    // (2) getAttribute produces a string: 'xxx' if =xxx, 'true' if attribute exists but no =, null if attribute doesn't exist
	    elt.update(elt.getAttribute('checked')!==null);
	}
    }
}


// list of functions

function compButtonSetup()
{
    var comp=document.createElement('button');
    comp.innerHTML="Complement";
    //    comp.style.position="absolute"; // not sure why?? check with firefox. move to html style=""

    this.insertBefore(comp,this.firstChild);
}

function compButtonUpdate()
{
    this.className='complement complement-'+this.checked;
}

function toggleButtonSetup()
{
    // insert the actual button
    var elt1=document.createElement('span');
    elt1.className="toggle-internal";
    var elt2=document.createElement('button');
    elt1.appendChild(elt2);
    this.insertBefore(elt1,this.firstChild);
    // TEMP
    //    elt1.style.position="absolute"; 
}

function toggleButtonUpdate()
{
    this.className="toggle-button"+(this.checked?" toggle-button-selected":"");
}
