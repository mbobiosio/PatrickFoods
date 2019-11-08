const select = document.getElementById("country-code");
function loadJSON(callback) {
    const xobj = new XMLHttpRequest();
    xobj.overrideMimeType("application/json");
    xobj.open('GET', 'js/data.json', true);
    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4) {
            callback(xobj.responseText);
        }
    };
    xobj.send(null);
}

function sortObjectArray(array, key) {
    return array.sort(function(a1, a2) {
        var b1 = Number.parseInt(a1[key].replace("+", ""));
        var b2 = Number.parseInt(a2[key].replace("+", "").toLowerCase());
        return ((b1 < b2) ? -1 : ((b1 > b2) ? 1 : 0));
    });
}

function addNumbers(array) {
    $('#country-code').ddslick({
        data:array,
        width:100,
        height: 300,
        selectText: "Code",
        imagePosition:"left",
        background: "#ffffff",
        defaultSelectedIndex: 0
    });
}

function init() {
    loadJSON(response => {
        const countryArray = JSON.parse(response);
        addNumbers(countryArray);
    });
}

init();