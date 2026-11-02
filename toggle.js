// Native controls plus the update() bridge used by URL/puzzle restoration.
function initToggle()
{
    var classes=['toggle-button','complement'];
    for (var i=0; i<classes.length; i++)
    {
	var controls=document.getElementsByClassName(classes[i]);
	for (var j=0; j<controls.length; j++)
	{
	    var control=controls.item(j);
	    control.update=function(value)
	    {
		value=!!value;
		var changed=this.checked!==value;
		this.checked=value;
		if (this.tagName==='BUTTON') this.setAttribute('aria-pressed',String(value));
		if (changed && this.onchange) this.onchange();
		return value;
	    };
	    if (control.tagName==='BUTTON') control.onclick=function() { this.update(!this.checked); };
	    control.update(control.getAttribute('checked')!==null);
	}
    }
}
