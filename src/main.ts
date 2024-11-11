import axios from "axios";

const domParser = new DOMParser();

const input = document.querySelector("[id=search-input]") as HTMLInputElement;
const button = document.querySelector("[id=scrape-btn]") as HTMLButtonElement;
const scrapeArea = document.querySelector("[id=google-results]") as HTMLDivElement;
const JSONArea = document.querySelector("[id=json-output]") as HTMLDivElement;
const downloadButton = document.querySelector('#save-btn') as HTMLButtonElement;

let arrayToStore:Array<GoogleResultEntry> = new Array();

button.addEventListener("click", requestGooglePage);

type TPossibleString = string | undefined;

class GoogleResultEntry {
  headline:string
  link:string
  description:string

  constructor (headline:TPossibleString, link:TPossibleString, description:TPossibleString) {
    
    if (typeof headline !== 'string')
      throw new Error(`Expected string for headline, but got ${headline}`)

    if (typeof link !== 'string')
      throw new Error(`Expected string for link, but got ${link}`)

    if (typeof description !== 'string')
      throw new Error(`Expected string for description, but got ${description}`)

    this.headline = headline;
    this.link = link;
    this.description = description;
  }
}


// server API call
function requestGooglePage() {

  axios.post('http://localhost:3000/scrape', {
    query: input.value.replace(/\s/g, '+'),
  })
  .then(response => {

    const preview = new DocumentFragment();
    const cleanResponse:string = response.data.replace(/�/g, '') // google tries to add esoteric characters even with multiple attempts of adding encodings, so removal of them was deemed as the most efficient solution

    //--------- verify results
    //---------------------------------------------------------------
    if (cleanResponse.match(/Did you mean:/)) {
      scrapeArea.innerHTML = '<b>Your query was not specific enough or contained malformed informations, thus it was shut down.</b>'; // better to have it empty, if we want to make it occupied, clean and safe!
      throw new Error("Results were not specific enough.")
    } else if (cleanResponse.match(/did not match any documents./)) {
      scrapeArea.innerHTML = '<b>Your query seems to be invalid, thus no results were found.</b>'; // better to have it empty, if we want to make it occupied, clean and safe!
      throw new Error("Resultsnot found.")
    }

    const page = domParser.parseFromString(cleanResponse, 'text/html');
    const results = page.querySelectorAll(".kCrYT:not(div[style] ~ .kCrYT)"); // selecting relevant data

    arrayToStore.length = 0;

    let entry:GoogleResultEntry | null = null;

    // preparing for loop
    let headline:TPossibleString;
    let link:TPossibleString;
    let description:TPossibleString;

    for (const node of results) {

      preview.appendChild(node);
      console.log(node)
      // processing link [headline + link]
      if (node.classList.contains("egMi0")) {
        const headlineNode = node.querySelector("a");

        link = headlineNode?.href.replace(/^(.*=)(https)/gm, '$2') // remove the local link, but retain the functional link
        headline = headlineNode?.querySelector("h3 div")?.innerHTML;
      // processing description and finalizing array object
      } else {
        const descriptionNode = node.querySelector(".BNeawe:not(:has(div))");
        description = descriptionNode?.innerHTML;

        // at this point scraping of single record is done, thus it can be pushed
        entry = new GoogleResultEntry(headline, link, description)
        arrayToStore.push(entry);

        // just to make sure, that we will have fresh results next time or an error
        link = undefined;
        headline = undefined;
        description = undefined
      }
    }

    // finalizing
    const finalJSON = {
      results: arrayToStore
    }

    // rendering
    scrapeArea.innerHTML = ''; // better to have it empty, if we want to make it occupied, clean and safe!
    scrapeArea.appendChild(preview);
    JSONArea.innerHTML = ''; // same as above
    console.log(JSON.stringify(finalJSON));
    JSONArea.innerHTML = JSON.stringify(finalJSON, null, 2).trim();

  })
  .catch(error => {
    console.error('Error:', error);
    JSONArea.innerHTML = 'Error occured.'; // same as above
  });

}

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

downloadButton.addEventListener('click', () => {
  const jsonData = { results: arrayToStore }; // Pass the correct JSON data here
  downloadJSON(jsonData); // Call the download function
});