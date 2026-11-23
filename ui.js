// Presentation helpers; puzzle enumeration and rendering remain in puzzle.js.
function reportInputError(message)
{
    var error=document.getElementById('input-error');
    if (error) { error.textContent=message; error.hidden=!message; }
    else if (message) alert(message);
}

function syncAssocLink(current)
{
    var link=document.getElementById('assoc-link');
    var description=document.getElementById('assoc-description');
    if (!link || !description) return;

    var available=!!(current && current.dataset.kind==='puzzle' && current.url);
    var reason='';
    if (available) link.setAttribute('href',current.url);
    else {
	link.removeAttribute('href');
	if (!current) reason='Compute a double puzzle to get started.';
	else if (current.dataset.kind!=='puzzle') reason='Select a numbered puzzle first.';
	else if (current.state.parts && current.state.parts.length===5)
	    reason='assoc opens double puzzles; this result is triangular.';
	else reason='assoc requires labels 0, 1, 10 and a shared boundary of 0s and 1s.';
    }
    link.setAttribute('aria-disabled',String(!available));
    link.title=available ? 'Opens in a new tab. You can also middle-click a result number.' : reason;
    var message='Explore the selected double puzzle in 3D.'+(reason?' '+reason:'');
    if (description.textContent!==message) description.textContent=message;
}

function syncInterface()
{
    var current=document.getElementById('current');
    syncAssocLink(current);
    var summary=document.getElementById('workspace-summary');
    if (!summary) return; // The solver can also run without the application shell.
    var manual=document.getElementById('manualpara');
    var height=document.getElementById('height').textContent;
    var width=document.getElementById('width').textContent;
    summary.textContent=(document.getElementById('double').checked?'Double puzzle':'Triangular puzzle')+' · '+height+' × '+width+' box';
    document.getElementById('calculation-settings').disabled=processAnimFlag || !!manual;
    document.getElementById('canvas-empty').hidden=!!current;
    document.getElementById('results-placeholder').hidden=document.getElementById('puzzles').children.length>1;
    var count=0;
    if (current) for (var button of current.parentElement.children)
	if (button.dataset.kind==='puzzle') count++;
    document.getElementById('result-count').textContent=current ? '· '+count+(count===1?' puzzle':' puzzles') : '';
    var status=document.getElementById('calculation-status');
    if (processAnimFlag) status.textContent='Computing · '+npuzzles+(npuzzles===1?' puzzle':' puzzles')+' found';
    else if (manual) status.textContent='Manual editing';
    else if (current) status.textContent=count+(count===1?' puzzle':' puzzles')+' in this calculation';
    else status.textContent='Ready to compute';
    var submit=document.getElementById('submit');
    if (processAnimFlag) {
	var fast=processDelay()===0;
	submit.textContent=fast?'Abort':'Finish';
	submit.onclick=fast?endAnim:shortenAnim;
    } else if (manual) {
	submit.textContent='Complete puzzle'; submit.onclick=complete;
    } else {
	submit.textContent=document.getElementById('editortoggle').checked?'Start editing':'Compute puzzles';
	submit.onclick=process;
    }
    var rotation=document.getElementById('rotation-toggle');
    rotation.textContent=randomanim?'Pause rotation':'Animate rotation';
    rotation.setAttribute('aria-pressed',String(!!randomanim));
}

async function copyPuzzleLink()
{
    updateURL();
    var input=document.getElementById('url');
    var status=document.getElementById('share-status');
    try {
	await navigator.clipboard.writeText(input.value);
	status.textContent='Link copied.';
    } catch (error) {
	input.focus(); input.select();
	status.textContent='Select and copy the link above.';
    }
}

function initInterface()
{
    document.addEventListener('click',function(event) {
	for (var details of document.querySelectorAll('.popover[open]'))
	    if (!details.contains(event.target)) details.open=false;
    });
    document.addEventListener('keydown',function(event) {
	if (event.key!=='Escape') return;
	for (var details of document.querySelectorAll('.popover[open]')) {
	    details.open=false;
	    details.querySelector('summary').focus();
	}
    });
    syncInterface();
}
