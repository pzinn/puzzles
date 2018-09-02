var timeout	= 200; // no 2 actions can be performed within this period
var menutimer	= new Object;
var ddmenuitem	= new Object;
var menucolored = new Object;

// open hidden layer
function mopen(menu,id)
{
//    document.getElementById('debug').innerHTML+=    "mopen"+menu+"/"+id+"<br/>";

    // close old layer
    mclose(menu);
    
    // get new layer and show it
    ddmenuitem[menu] = document.getElementById(id);
    ddmenuitem[menu].removeAttribute('hidden');
}

// close showed layer
function mclose(menu)
{
    // cancel timer
    mcanceltimer(menu);

    if (ddmenuitem[menu]) ddmenuitem[menu].hidden = true; // as usual true means nothing here
    ddmenuitem[menu]=null;

    menutimer[menu] = window.setTimeout(mnothing, timeout,menu);
}

function mnothing(menu) // temporarily deactive clicking
{
    menutimer[menu]=null;
}

// go close timer
function mclosetime(menu)
{
    menutimer[menu] = window.setTimeout(mclose, timeout,menu);
}

// cancel close timer
function mcanceltimer(menu)
{
    if (menutimer[menu])
    {
	window.clearTimeout(menutimer[menu]);
	menutimer[menu] = null;
    }
}

// toggle open/close of a given menu
function mtoggle(menu,id)
{
//    document.getElementById('debug').innerHTML=    "mtoggle"+ddmenuitem[menu]+"<br/>";

    if (menutimer[menu]==null) // only if not busy
        if (document.getElementById(id)==ddmenuitem[menu]) mclose(menu); else mopen(menu,id);
}

// style differently the selected title
function mstyle(menu,caller)
{
    if (menucolored[menu]) menucolored[menu].className="menu-title";
    caller.className="menu-title-active";
    menucolored[menu]=caller;
}
