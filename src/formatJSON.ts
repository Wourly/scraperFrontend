//================================================================================================
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% FormatJSON
//%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
//
// JSON is a decently readable format, but when it cumps together, you cannot really see much
// so why not to make it a bit more readable? Colors and indentation will not hurt!
///
export function formatJSON (text:string) {
    
    let results = text;
    results = results.replace(/("headline"):(".+?"),/gm, `<div class="jsonKeyValuePair"><span class="key">$1</span>:<span class="value headline">$2</span>,</div>`);
    results = results.replace(/("link"):(".+?"),/gm, `<div class="jsonKeyValuePair"><span class="key">$1</span>:<span class="value link">$2</span>,</div>`);
    results = results.replace(/("description"):(".+?")}./gm, `<div class="jsonKeyValuePair"><span class="key">$1</span>:<span class="value">$2</span></div><div class="endBracket">},</div>`);
    results = results.replace(/},<\/div>}/gm, "}]<br>}");

    return results;

}