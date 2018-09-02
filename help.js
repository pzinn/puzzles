function openhelp(caller)
{
    caller.helpargs=arguments;
    var obj;
    for (var i = 0; i < arguments.length; i++) 
	{
	    obj=arguments[i];
	    if (typeof obj=="string") obj=document.getElementById(obj);
	    obj.classList.add("help");
	}
}

function closehelp(caller)
{
    var obj;
    for (var i = 0; i < caller.helpargs.length; i++) 
	{
	    obj=caller.helpargs[i];
	    if (typeof obj=="string") obj=document.getElementById(obj);
	    obj.classList.remove("help");
	}
}
