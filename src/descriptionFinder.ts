//================================================================================================
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% Function aimed at flexibly identifying description
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
//
// This piece of code anticipates, that google structure can change and thus it does not operate with classes
//      key piece: main anchor element, that contains headline
//          this is a starting point from which the code below can locate description without any additional details
//

//==============================================================
//========== Main function
//==============================================================
export function descriptionFinder (mainNode:HTMLDivElement, mainAnchor:HTMLAnchorElement):HTMLDivElement | null {

    let childrenWithText:Array<HTMLElement>;
    let favouredChild:HTMLElement | null;

    let currentlyProbedElement:HTMLElement | null = mainAnchor;

    while (true) {
        currentlyProbedElement = findMultiChildParent(currentlyProbedElement, mainNode); // currentlyProbedElement changes, so that it can go upwards in DOM

        if (currentlyProbedElement !== null) {

            childrenWithText = getChildrenWithText(currentlyProbedElement, mainAnchor); // if it finds a multiChildElementUpwards and sees, that it has children, it probes whether they contain text
            
            favouredChild = getFavouredChild(childrenWithText);                         // if that happens, then it makes sense to 

            if (favouredChild) {

                return favouredChild as HTMLDivElement;
            }
        } else {
            break;
        }

        if (currentlyProbedElement === mainNode && mainNode.childElementCount <= 1) {
            break;
        }
    }

    return null;

}

//--------- FindMultiChildParent
//---------------------------------------------------------------
// as simple as it sounds, it will go upwards in DOM
// until it sees a parent, that has more children
function findMultiChildParent (currentNode:HTMLElement | null, mainNode:HTMLDivElement):HTMLElement | null {

    let candidateNode:HTMLElement | null = null;
    
    if (currentNode === null)
        return null;

    if (currentNode === mainNode) {
        candidateNode = currentNode
    } else if (currentNode.parentElement) {
        candidateNode = currentNode.parentElement
    } else {
        candidateNode = null;
    }

    if (candidateNode !== null)
        if (candidateNode.childElementCount > 1)
            return candidateNode
        else
            return findMultiChildParent(candidateNode, mainNode)

    return candidateNode;
}

//--------- GetChildrenWithText
//---------------------------------------------------------------
// we already have elements, that have children,
// but we specifically want to determine, whether they have any text
function getChildrenWithText (parent:HTMLElement, mainAnchor:HTMLAnchorElement) {

    let textElementCandidates: Array<HTMLElement> = [];

    for (const child of parent.children) {
        if (child.querySelector('a') === mainAnchor) {      // we do not want to search text in already established main structure, we want other children
            continue;
        } else {
            if (child.textContent?.trim() !== '') {
                textElementCandidates.push(child as HTMLElement);
            }
        }
    }

    return textElementCandidates;

}

//--------- GetFavouredChild
//---------------------------------------------------------------
//
// description text contains no anchors, so we are not reversing our approach and..
// going the opposite way -> from parent to child until we end up with a child, that 
function getFavouredChild (children:Array<HTMLElement>):HTMLElement | null {

    let favouredChild:HTMLElement | null = null;

    for (const child of children) {
        if (!child.querySelector("a") && child.textContent) {
            favouredChild = child;
         } else if (child.textContent && child.children && child.childElementCount >= 0) {
            favouredChild = getFavouredChild(child.children as unknown as Array<HTMLElement>)

         }
    }

    return favouredChild;

}