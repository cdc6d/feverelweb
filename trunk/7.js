//           Edition    0    1    2    3    4    5    6    7
const kFirstPages = [ 202, 220, 105, 999, 999, 999, 999, 999 ]
const kLastPages  = [ 215, 238, 132, 999, 999, 999, 999, 999 ]

var   gNumEditions = 1

// ----------- Dynamic Notes: Utility ----------- //

// Returns a list of 0 to 'gNumEditions' anchor elements for note 'noteNum'.
function getAnchors (noteNum)
{
	var anchors = []
	for ( var ed = 0; ed < gNumEditions; ++ed ) {
		var e = document.getElementById ("s" + noteNum + "e" + ed)
		if ( e ) anchors.push(e)
	}
	return anchors
}
function anchorsForNoteBox(b)  // b.id is "n" followed by integer note #.
	{ return getAnchors (b.id.substring(1)) }

function getNoteBox(n)
	{ return document.getElementById ("n" + n) }

function noteBoxForAnchor(s)
	{ return getNoteBox ( s.id.replace (/s([0-9]+)e[0-9]+/, "$1") ) }

function isAnchor(e)
{
	if ( !e.className ) return false
	return e.className.search (/\bnote\b/) >= 0
}
function isAnchorInactive(a) { return a.className.search (/\binactive\b/) >=0 }
function isAnchorActive  (a) { return a.className.search (/\bactive\b/  ) >=0 }
function isAnchorHighlit (a) { return a.className.search (/\bhighlit\b/ ) >=0 }
function isAnchorSticky  (a) { return a.className.search (/\bsticky\b/  ) >=0 }

const anyNoteType = /\b(inactive|active|highlit|sticky)\b/g

function makeAnchorInactive(a) { replaceInClassName(a,anyNoteType,"inactive") }
function makeAnchorActive  (a) { replaceInClassName(a,anyNoteType,"active"  ) }
function makeAnchorHighlit (a) { replaceInClassName(a,anyNoteType,"highlit" ) }
function makeAnchorSticky  (a) { replaceInClassName(a,anyNoteType,"sticky"  ) }

function showNoteBox   (b) { replaceInClassName (b, /\bhidden\b/ , "shown"  ) }
function hideNoteBox   (b) { replaceInClassName (b, /\bshown\b/  , "hidden" ) }
function hoverNoteBox  (b) { replaceInClassName (b, /\bnohover\b/, "hover"  ) }
function noHoverNoteBox(b) { replaceInClassName (b, /\bhover\b/  , "nohover") }

function forEachNoteBox (func)
{
	for ( var n = 0, e = getNoteBox(n); e; e = getNoteBox(++n) )
		func (e,n)
}

// ----------- Other Utility ----------- //

function replaceInClassName (e, rx, newName)
	{ e.className = e.className.replace (rx, newName) }

function forEachElement (list, func)  // Use JS 1.6's list.forEach() instead?
{
	for ( var n = 0; n < list.length; ++n )
		func (list[n])
}

function getEdCheckbox(n)
	{ return document.getElementById ("checkEdition" + n) }

function getBaseEditionNum()
{
	var e = document.getElementById ("selectBaseEdition")
	return e.options[e.selectedIndex].value
}

function isValidPageNum (pageNum, edNum)
{
	// Note that, if pageNum is not a number, this returns false.
	return pageNum >= kFirstPages[edNum] &&
		   pageNum <= kLastPages [edNum]
}

function countCheckedEditions()
{
	var count = 0
	for ( var ed = 0; ed < gNumEditions; ++ed )
		count += getEdCheckbox(ed).checked
	return count
}

function debug(s)
{
	var e = document.getElementById ("debugText")
	var n = document.createTextNode (s + '\n')
	e.appendChild (n)

	// Scroll to bottom.
	// Infinity and Number.MAX_VALUE don't work here in my Firefox.
	// Not W3C.
	e.scrollTop = 1000000
}

// ------------------------------------------------------------------------ //
// ------------ "Public" (i.e. Accessed by the Document) Stuff ------------ //
// ------------------------------------------------------------------------ //

// ----------- Dynamic Notes ----------- //

// When the pointer enters an anchor, the following should happen:
// - If no editions are checked: nothing.
// - Otherwise:
//     - The note's style should change to indicate its
//       correspondence with the anchor.
//     - If the note is not sticky, it should pop up and
//       the anchor should become highlit.

function floatNote(a)
{
	var b = noteBoxForAnchor(a)
	hoverNoteBox(b)
	if ( isAnchorActive(a) ) {
		showNoteBox(b)
		makeAnchorHighlit(a)
	}
}

// When the pointer leaves an anchor, the following should happen:
// - If no editions are checked: nothing.
// - Otherwise:
//     - The note's style should change to indicate its
//       correspondence with the anchor.
//     - If the note is not sticky, it should disappear and the anchor
//       should lose its highlight (switch back to the active style).

function exitNote(a)
{
	var b = noteBoxForAnchor(a)
	noHoverNoteBox(b)
	if ( isAnchorHighlit(a) ) {
		hideNoteBox(b)
		makeAnchorActive(a)
	}
}

// When an anchor is clicked, the following should happen:
// - If no editions are checked: nothing.
// - Otherwise, if the note is sticky:
//     the note is set non-sticky and disappears;
//     the corresponding anchors in all editions switch to the active style;
//     the anchor that was clicked stays highlit.
// - Otherwise:
//     the note is set sticky;
//     the note appears (if it was just made to disappear by clicking);
//     the corresponding anchors in all editions switch to the sticky style.

function clickNote(a,evt)
{
	if ( isAnchorInactive(a) ) return
	var b = noteBoxForAnchor(a)
	var aa = anchorsForNoteBox(b)
	b.sticky = !b.sticky
	if ( isAnchorSticky(a) ) {
		forEachElement (aa, makeAnchorActive)
		makeAnchorHighlit(a)
		hideNoteBox(b)
	} else {
		forEachElement (aa, makeAnchorSticky)
		showNoteBox(b)
	}
	evt.stopPropagation()
}

// When a page is clicked, the following should happen:
// - If no editions are checked: nothing.
// - Otherwise, if some notes on the page are not currently sticky:
//     - All notes on the page appear and become sticky.
//     - All corresponding anchors in all editions switch to the sticky style.
// - Otherwise:
//     - Let S be the set of all notes that became sticky when the page
//       was last clicked.  If S is empty, let S be all notes on the page.
//     - For all notes in S:
//        the notes are set non-sticky and disappear;
//        the corresponding anchors in all editions switch to the active style.

function clickPage(p,evt)
{
	function changeNotes (a, yn, noteBoxFunc, anchorFunc)
	{
		var b = noteBoxForAnchor(a)
		b.sticky = yn
		noteBoxFunc(b)
		forEachElement (anchorsForNoteBox(b), anchorFunc)
	}
	function findAnchors (root, tagName)
	{
		var anchors = []
		var elems = root.getElementsByTagName (tagName)
		forEachElement ( elems, function(e) {
			if ( isAnchor(e) ) anchors.push(e)
		} )
		return anchors
	}
	try {
		if ( countCheckedEditions() == 0 ) return
		var anchors = findAnchors(p,"span").concat(
		              findAnchors(p,"div")).concat(
		              findAnchors(p,"img"))
		var allSticky = true
		forEachElement ( anchors, function(a) {
			if ( !isAnchorSticky(a) )        // Could optimize by
				allSticky = false              // breaking out early.
		} )
		if ( !allSticky ) {
			p.becameSticky = []
			forEachElement ( anchors, function(a) {
				if ( !isAnchorSticky(a) ) {
					p.becameSticky.push(a)
					changeNotes (a, true, showNoteBox, makeAnchorSticky)
				}
			} )
		}
		else {
			if ( !p.becameSticky || p.becameSticky.length == 0 )
				p.becameSticky = anchors
			forEachElement ( p.becameSticky, function(a) {
				changeNotes (a, false, hideNoteBox, makeAnchorActive)
			} )
			p.becameSticky = []
		}
	} catch (e) {
		alert ("Problem in clickPage(): " + e)
		e.alerted = true
		throw e
	}
}

// When a checkbox for an edition is clicked, the following should happen:
//
// - If no checkboxes were active prior to this one, then all notes should
//   go from inactive back to the state they were in before they became
//   inactive, which should be either active or sticky.
//     - For sticky notes, the notes should appear and the corresponding
//       anchors in all editions should switch to the sticky style.
//     - For non-sticky notes, the corresponding anchors in all editions
//       should switch to the active style.
//
// - Otherwise, if a checkbox was cleared and there are no more checked boxes,
//   all notes should disappear and all anchors should become inactive, but
//   their prior state (active or sticky) should be saved.
//
// - The note text for the edition that was checked/cleared should be added/
//   removed to/from all notes.  (N.B.: we make a nasty assumption about
//   where to find the CSS rules to accomplish this.)

function showNotes(ed)
{
	function deactivateLinks()
	{
		forEachNoteBox ( function(b,n) {
			forEachElement (getAnchors(n), makeAnchorInactive)
			hideNoteBox(b)
		} )
	}
	function activateLinks()
	{
		forEachNoteBox ( function(b,n) {
			forEachElement (getAnchors(n), function(a) {
				if ( b.sticky ) makeAnchorSticky(a)
				else            makeAnchorActive(a)
			} )
			if ( b.sticky ) showNoteBox(b)
		} )
	}
	try {
		var r = document.styleSheets[2].cssRules[ed]
		if ( !r )
			alert ("showNotes: no CSS rule for edition " + ed)
		if ( getEdCheckbox(ed).checked ) {
			r.style.display = ""
			activateLinks()
		} else {
			r.style.display = "none"
			if ( countCheckedEditions() == 0 )
				deactivateLinks()
		}
	} catch (e) {
		alert ("Problem in showNotes(): " + e)
		e.alerted = true
		throw e
	}
}

// When the "All" or "None" sticky notes buttons are pressed,
// the following should happen:
//
// - If "None" pressed: all notes lose their sticky state.
// - If "All" pressed: all notes gain sticky state.
//
// - If any editions are selected:
//     - For notes that have gained sticky state:
//         - the note should appear;
//         - the corresponding anchors in all editions should
//           switch to the sticky style.
//     - For notes that have lost sticky state:
//         - the note should disappear;
//         - the corresponding anchors in all editions should
//           switch to the active style.
//
// - We assume that the pointer is not floating over any
//   anchors when this function is called.

function setAllSticky(yn)
{
	function makeAllSticky (noteBoxFunc, anchorFunc)
	{
		forEachNoteBox ( function(b,n) {
			noteBoxFunc(b)
			forEachElement (anchorsForNoteBox(b), anchorFunc)
		} )
	}
	try {
		forEachNoteBox ( function(b,n) { b.sticky = yn } )
		if ( countCheckedEditions() > 0 ) {
			if ( yn ) makeAllSticky (showNoteBox, makeAnchorSticky)
			else      makeAllSticky (hideNoteBox, makeAnchorActive)
		}
	}
	catch (e) {
		alert ("Problem in setAllSticky(): " + e)
		e.alerted = true
		throw e
	}
}

// ----------- Editions ----------- //

// The effect of this function should be that of either checking
// or clearing all edition checkboxes one after the other.

function selectAllEditions(yn)
{
	for ( var ed = 0; ed < gNumEditions; ++ed ) {
		getEdCheckbox(ed).checked = yn
		showNotes(ed)
	}
}

// Whenever the selected edition changes:
//   - The currently displayed edition should be hidden.
//   - The selected edition should be shown.
//   - If not calculated yet, the dimensions & offsets of the pages
//     should be calculated.
//   - The view should scroll to the page that was being viewed before
//     the selection was changed.

function resetBaseEdition()
{
	function switchClass (id, rx, newName)
		{ replaceInClassName ( document.getElementById(id), rx, newName ) }

	function getElemDimPx (elem, dim)
	{
		var dec = window.getComputedStyle (elem, null)  // CSSStyleDeclaration
		var val = dec.getPropertyCSSValue (dim)         // CSSValue

		if ( val.cssValueType != CSSValue.CSS_PRIMITIVE_VALUE )
			debug ( "CSS value '" + val.cssText + "' is not primitive.")

		if ( val.primitiveType != CSSPrimitiveValue.CSS_PX )
			debug ( "CSS value '" + val.cssText + "' is not in px.")

		return val.getFloatValue ( CSSPrimitiveValue.CSS_PX )
	}

	function calcPagePositions (edId)
	{
		// The parent of the elements containing the pages.
		var edRow = document.getElementById (edId)

		if ( edRow.pagePositionsCalculated ) {
			debug (edId + ": positions already calculated.")
			return
		}
		edRow.pagePositionsCalculated = true

		var lastPageX = 0
		forEachElement ( edRow.childNodes, function(cellElem) {
			if ( cellElem.nodeType == Node.ELEMENT_NODE ) {
				cellElem.pageX = lastPageX
				lastPageX += getElemDimPx ( cellElem, "width" )
			}
		} )
	}

	try {
		var edNum = getBaseEditionNum()
		var edId  = "edition" + edNum
		var pubId = "publicationInfoEdition" + edNum

		if ( this.lastEdId ) {
			switchClass (this.lastEdId,  /\bshown\b/, "hidden")
			switchClass (this.lastPubId, /\bshown\b/, "hidden")
		}
		switchClass (edId,  /\bhidden\b/, "shown")
		switchClass (pubId, /\bhidden\b/, "shown")

		this.lastEdId  = edId
		this.lastPubId = pubId

		calcPagePositions (edId)

		// Fill the "pageNum" text box with a valid page number
		// and scroll to that page.

		var pageNumBox = document.getElementById ("pageNum")

		// STUB CODE -- we must come up with a smarter way to choose
		//              which page to transition to.
		pageNumBox.value = kFirstPages[edNum];

		scrollToPage()
	}
	catch (e) {
		alert ("Problem switching base editions; sorry!\n" + e)
		e.alerted = true
		throw e
	}
}

// ----------- Other ----------- //

// Since some browsers keep the state of checkboxes, etc. when the page
// is reloaded, we need to get into sync with the GUI.  This function should
// act as if the user had just
//   - checked/cleared the edition checkboxes to arrive at the current state;
//   - changed the base edition to the current selection.

function initGUI()
{
	try {
		// Process state of "base text" select box.
		resetBaseEdition()

		// Find out real number of editions.
		for ( gNumEditions = 0; getEdCheckbox(gNumEditions); ++gNumEditions ) ;

		// Process state of checkboxes.
		for ( var ed = 0; ed < gNumEditions; ++ed )
			showNotes(ed)
	}
	catch (e) {
		if ( !e.alerted )
			alert ("Problem initializing; some interactive features\n" +
			       "may not work.\n\n" + e)
	}
	finally {
		document.getElementById("startupMessage").style.display = "none"
	}
}

// Clicking the < and > buttons should scroll the page view by exactly
// the width of one page.  If notes are set to come up/go away as the
// anchors come in and out of view, then the notes should be updated.

function scrollPage(dir)
{
	var pageNumBox = document.getElementById ("pageNum")
	var pageNum    = +pageNumBox.value + dir
	var e          = getBaseEditionNum()

	if ( isValidPageNum (pageNum, e) ) {
		pageNumBox.value = pageNum
		scrollToPage()
	}
}

function scrollToEnd()
{
	document.getElementById("pageNum").value =
		kLastPages [ getBaseEditionNum() ]
	scrollToPage()
}

function scrollToBeginning()
{
	document.getElementById("pageNum").value =
		kFirstPages [ getBaseEditionNum() ]
	scrollToPage()
}

// Entering a specific page number should bring that page into full view.
// If notes are set to come up/go away as the anchors come in and out
// of view, then the notes should be updated.

function scrollToPage()
{
	try {
		var pageNum    = document.getElementById ("pageNum").value
		var scrollView = document.getElementById ("textScrollView")
		var edNum      = getBaseEditionNum()

		if ( !isValidPageNum (pageNum, edNum) )
			return scrollToBeginning()

		var pageID = "e" + edNum + "p" + pageNum

		var bp = document.getElementById (pageID)  // class bookPage
		if ( !bp ) return

		var gc = bp.parentNode

		// We could do gc.scrollIntoView() here, but that is not W3C.
		// IE and Firefox and Safari all implement it differently;
		// Safari doesn't do exactly what we want.

		// Let's try to do better...

		if ( gc.nodeType != Node.ELEMENT_NODE ) {
			debug ("bookPage's parent node is not an element")
			return
		}
		if ( gc.className != "gridCell" ) {
			debug ("bookPage's parent element is not a gridCell")
			return
		}

		// scrollLeft is not W3C; is it implemented consistently?
		scrollView.scrollLeft = gc.pageX
	}
	catch (e) {
		alert ("Problem in scrollToPage(): " + e)
		e.alerted = true
		throw e
	}
}
