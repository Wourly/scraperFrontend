import axios from "axios";
import { descriptionFinder } from "./descriptionFinder";
import { formatJSON } from "./formatJSON";

const domParser = new DOMParser();


interface IDOM {
  input:HTMLInputElement
  scrapeArea:HTMLDivElement
  JSONArea:HTMLDivElement
  scrapeButton:HTMLButtonElement
  downloadButton:HTMLButtonElement
  loadingIndicator:HTMLDivElement
}

//--------- Elements, that we will use
//---------------------------------------------------------------
const DOM:IDOM = {
  input: document.querySelector("[id=search-input]") as HTMLInputElement,
  scrapeArea: document.querySelector("[id=google-results]") as HTMLDivElement,
  JSONArea: document.querySelector("[id=json-output]") as HTMLDivElement,
  scrapeButton: document.querySelector("[id=scrape-btn]") as HTMLButtonElement,
  downloadButton: document.querySelector('#save-btn') as HTMLButtonElement,
  loadingIndicator: document.querySelector("#loading-indicator") as HTMLDivElement
}

//--------- We certainly want them all ready, no missed queries
//---------------------------------------------------------------
for (const key in DOM) {
  const element = DOM[key as keyof IDOM];

  if (element === null) {
    throw new Error(`Key element was not connected to application: ${key}.`)
  }
}


let arrayToStoreEntries:Array<GoogleResultEntry> = new Array();

DOM.scrapeButton.addEventListener("click", requestGooglePage);

//--------- 
//---------------------------------------------------------------
interface IPriorityEntryElements {
  [key:string]: HTMLElement | null
  headline: HTMLHeadElement | null,
  anchor: HTMLAnchorElement | null,
  description: HTMLDivElement | null
}

//--------- Storing JSON entries
//---------------------------------------------------------------
type TGoogleResultEntry = {
  headline: string,
  link:string,
  description:string
}

class GoogleResultEntry {
  headline:string
  link:string
  description:string

  constructor (constructorObject:TGoogleResultEntry) {

    this.headline = constructorObject.headline;
    this.link = constructorObject.link;
    this.description = constructorObject.description;
  }
}
//---------------------------------------------------------------
//--------- Storing JSON entries end

//================================================================================================
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% API CALL
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
function requestGooglePage() {
  DOM.loadingIndicator.classList.add("visible");
  arrayToStoreEntries.length = 0;

  axios.post('http://localhost:3000/scrape', {
    query: DOM.input.value.replace(/\s/g, '+'),
  })
  .then(response => {

    const cleanResponse:string = response.data.replace(/�/g, '') // google tries to add esoteric characters, even with multiple attempts of adding encodings, so removal of them was deemed as the most efficient solution

    //--------- verify if any results were found
    //---------------------------------------------------------------
    if (cleanResponse.match(/did not match any documents./)) {
      DOM.scrapeArea.innerHTML = '<b>Your query seems to be invalid, thus no results were found.</b>'; // better to have it empty, if we want to make it occupied, clean and safe!
      throw new Error("Resultsnot found.")
    }

    const page = domParser.parseFromString(cleanResponse, 'text/html');
    const resultContainer = page.querySelector("div#main") as HTMLDivElement; // selecting relevant data
    
    resultContainer.querySelector("div[data-hveid")?.remove();
    resultContainer.querySelector("footer")?.remove();
    resultContainer.querySelectorAll(".X7NTVe")?.forEach(node => node.remove());


    //--------- was google adjusting query?
    //---------------------------------------------------------------
    const changedQueryContainers = resultContainer.querySelectorAll("#scc a");
    let changedQuery = '';

    // storing information about the different query
    if (changedQueryContainers.length === 2) {
      if (changedQueryContainers[0].textContent) {
        changedQuery = changedQueryContainers[0].textContent;
      }
    }

    const nodesLength = resultContainer.children.length;


    //==============================================================
    //========== result finding loop
    //==============================================================
    // reverse approach is mandatory, since node.remove() is used and it would mess up with the order
    resultLoop: for (let reverseIterator = nodesLength - 1; reverseIterator >= 0; reverseIterator--) {

      const node = resultContainer.children[reverseIterator] as HTMLDivElement;

      //--------- lookig up for priority elements
      //---------------------------------------------------------------
      const mainAnchor = node.querySelector('a') as HTMLAnchorElement;

      const priorityElements:IPriorityEntryElements = {
        headline: node.querySelector('h3') as HTMLHeadElement,
        anchor: mainAnchor,
        description: descriptionFinder(node, mainAnchor)      // advanced function, that does not rely on classes, but can find description on its own with just two clues
      }

      //--------- checking, whether key elements are valid
      //---------------------------------------------------------------
      for (const element in priorityElements) {
        if (priorityElements[element] === null) {
          node.remove();
          continue resultLoop;
        }
      }

      //--------- adding style to valid nodes
      //---------------------------------------------------------------
      node.classList.add("validNode");
      priorityElements.anchor?.classList.add("mainAnchor");

      //--------- cleaning anchors
      //---------------------------------------------------------------
      const allAnchorsInNode = node.querySelectorAll("a");

      for (const anchor of allAnchorsInNode) {
        if (anchor.href) {
          anchor.href = anchor.href.replace(/^(.*=)(https)/gm, '$2')
        }
      }


      //--------- creating JSON object data for entry
      //---------------------------------------------------------------
      const googleResultEntry = new GoogleResultEntry ({
        headline: priorityElements.headline!.innerText,
        link: priorityElements.anchor!.href, // link appends local url in front of it, malforming it -> this regexp fixes it
        description: priorityElements.description!.innerText
      })

      arrayToStoreEntries.push(googleResultEntry);
    }
    //==============================================================
    //========== result finding loop end
    //==============================================================

    // finalizing
    DOM.scrapeArea.innerHTML = '';
    DOM.JSONArea.innerHTML = '';
    const finalJSON = {
      results: arrayToStoreEntries.reverse() // needed because of reverseNodeCollection
    }

    // rendering
    if (changedQuery) {
      const storageDiv = document.createElement("div");
      storageDiv.classList.add("changedQuery")
      storageDiv.innerText = `Google searched for ${changedQuery} instead!`;
      DOM.scrapeArea.appendChild(storageDiv);
    }
    DOM.scrapeArea.appendChild(resultContainer);

    DOM.JSONArea.innerHTML = formatJSON(JSON.stringify(finalJSON));
    DOM.downloadButton.setAttribute("data-state", "enabled");
  })
  .catch(error => {
    console.error('Error:', error);
    DOM.JSONArea.innerHTML = 'Error occured.';  // same as above
    DOM.downloadButton.setAttribute("data-state", "disabled");
  })
  .finally(() => {
    DOM.loadingIndicator.classList.remove("visible");
  });
}
//================================================================================================
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% API CALL END
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

// Download JSON as file
function downloadJSON(jsonData: object) {
  const jsonStr = JSON.stringify(jsonData, null, 2); // Format JSON data
  const blob = new Blob([jsonStr], { type: 'application/json' }); // Create a Blob from the JSON string
  const link = document.createElement('a'); // Create a temporary <a> element
  link.href = URL.createObjectURL(blob); // Create an object URL for the Blob
  link.download = 'google_results.json'; // Specify the default filename
  link.click(); // Trigger the download by "clicking" the link
}

// Add the event listener to the download button
DOM.downloadButton.addEventListener('click', () => {

  if (DOM.downloadButton.getAttribute("data-state") !== "enabled")
    return;

  const jsonData = { results: arrayToStoreEntries }; // Pass the correct JSON data here
  downloadJSON(jsonData); // Call the download function
});