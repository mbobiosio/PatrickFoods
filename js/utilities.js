function Validator() {
    this.email = function (value) {
        return value.trim().match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]+$/);
    }

    this.phone = function (value) {
        return value.match(/^(\+?)([0-9]+)$/);
    }

    this.number = function (value) {
        if (typeof value == 'number') return true;
        return value.match(/^([0-9]+)$/);
    }

    this.amount = function (value) {
        return value.match(/^\d+(\.\d{1,2})?$/);
    }

    this.password = function (value) {
        return value.match(/[a-zA-Z]/) && value.match(/[0-9]/) && value.length >= 6;
    }

    this.required = function (value) {
        if (!value) return false;
        return value.trim() != "";
    }

    var imageFilter = /^(?:image\/gif|image\/jpeg|image\/png)$/i;
    this.image = function (fileType) {
        return imageFilter.test(fileType);
    }
}
Validate = new Validator();

function XHR(url, method) {
    this.xhr = null;
    if (window.XMLHttpRequest !== undefined) {
        this.xhr = new XMLHttpRequest();
        this.xhr.open(method, url, true);
    }
    else if (window.XDomainRequest !== undefined) {
        this.xhr = new XDomainRequest();
        this.xhr.open(method, url);
    }

    return this.xhr;
}

function AuthBot() {
    this.key = 'farmforte-jwt';
    this.setToken = function (token) {
        localStorage.setItem(this.key, token);
    }

    this.getToken = function () {
        return localStorage.getItem(this.key);
    }

    this.unsetToken = function (token) {
        localStorage.removeItem(this.key);
    }

    this.parseToken = function () {
        var token = this.getToken();
        if (!token) return null;
        return JSON.parse(atob((token.split("."))[1]))
    }

    this.setHeader = function () {
        return 'Bearer ' + this.getToken();
    }
}
var authBot = new AuthBot();

function ButtonLoader(node) {
    if (!node) return;
    this.bg = node.style.backgroundColor;
    this.html = node.innerHTML;
    this.node = node;

    this.setLoader = function () {
        node.disabled = true;
        //node.innerHTML = '<div id="loader-6" class="loaderize"><span></span><span></span><span></span><span></span></div>';
        var loadingText = node.getAttribute('data-wait');
        node.innerHTML = (loadingText) ? loadingText : "loading...";
    }

    this.removeLoader = function () {
        node.disabled = false;
        node.innerHTML = this.html;
    }
}

function generateUID(n) {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    var s = '';
    for (var i = 0; i < n; i++) {
        s += s4();
    }
    return s;
}

function formatDate(d) {
    var days = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var date = new Date(d);
    return days[date.getDay()] + " - " + date.getDate() + " " + months[date.getMonth()] + ", " + date.getFullYear();
}

function formatAmount(amount) {
    return Number(amount).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
}

function cropImageToSquare(file, callback) {
    var image = new Image();
    image.onload = function () {
        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        var sx = 0;
        var sy = 0;
        if (image.width > image.height) {
            canvas.width = canvas.height = image.height;
            sx = (image.width - image.height) / 2;
        }
        else if (image.width < image.height) {
            canvas.width = canvas.height = image.width;
            sy = (image.height - image.width) / 2;
        }
        else if (image.width == image.height) {
            canvas.width = canvas.height = image.width;
        }
        context.drawImage(image, sx, sy, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        // canvas.toBlob(function(blob){
        //     callback(blob);
        // }, 'image/jpeg', 0.8);

        var blob = dataURItoBlob(canvas.toDataURL('image/jpeg', 0.8));
        callback(blob);
    }

    var reader = new FileReader();
    reader.onloadend = function () {
        image.src = reader.result;
    }
    reader.readAsDataURL(file);

}

function dataURItoBlob(dataURI) {
    var byteString = atob(dataURI.split(',')[1]);

    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    var ab = new ArrayBuffer(byteString.length);
    var dv = new DataView(ab);

    for (var i = 0; i < byteString.length; i++) {
        dv.setUint8(i, byteString.charCodeAt(i));
    }

    return new Blob([ab], { type: mimeString });
}

function getTokenData(token) {
    try {
        var data = token.split('.');
        return JSON.parse(atob(data[1]));
    } catch (e) {
        // statements
        console.log(e);
    }
}

function postData(endpoint, formData, authenticate, callback) {
    var xhr = new XHR(endpoint, 'POST');
    if (xhr) {
        xhr.onload = function () {
            var status = xhr.status;
            var data = null;
            try {
                data = JSON.parse(xhr.responseText);
            } catch (e) {
                // statements
                status = 500;
                data = null;
                console.log(e);
            }

            callback(status, data);
        }

        xhr.onerror = function () {
            callback(null, null);
        }
        if (authenticate) xhr.setRequestHeader("Authorization", authBot.setHeader());
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(formData));
    }
}

function getData(endpoint, authenticate, callback) {
    var xhr = new XHR(endpoint, 'GET');
    if (xhr) {
        xhr.onload = function () {
            try {
                var data = JSON.parse(xhr.responseText);
                callback(xhr.status, data);
            } catch (e) {
                // statements
                callback(500, null);
                console.log(e);
            }
        }

        xhr.onerror = function () {
            callback(null, null);
        }
        if (authenticate) xhr.setRequestHeader("Authorization", authBot.setHeader());
        xhr.send();
    }
}

function parseAuthenticationError(status) {
    if (status == 401) {
        window.location = '/';
    }
}

function parseFormError(form, status, data) {
    var feedBackHolder = form.getElementsByClassName('feedback-box')[0];
    if (!status) {
        showFeedback(true, "Connection failed", feedBackHolder);
    }
    else if (status == 400) {
        parseFieldErrors(form, data)
    }
    else if (status == 500) {
        showFeedback(true, "Oops! Something went wrong. Please try again later", feedBackHolder);
    }
}

function parseFieldErrors(form, error) {
    if (error.length < 1) {
        return true;
    }

    var errMsgs = [];
    if (Array.isArray(error)) {
        error.forEach(function (err) {
            displayError(form.getElementsByClassName(err.field)[0], err.msg);
            errMsgs.push(err.msg);
        });
    }
    else if (typeof error == "object") {
        for (var key in error) {
            displayError(form.getElementsByClassName(key)[0], error[key]);
            errMsgs.push(error[key]);
        }
    }

    if (errMsgs.length > 0) {
        showFeedback(true, errMsgs.join("<br>").replace(/(<br>)+<br>/g, '<br>'), form.getElementsByClassName('feedback-box')[0]);
    }

    return false;
}

function removeErrors(form) {
    var errorBorders = form.getElementsByClassName('form-error');
    var n = errorBorders.length;
    for (var i = 0; i < n; i++) {
        errorBorders[0].classList.remove('form-error');
    }

    var errorSpans = form.getElementsByClassName('form-error-content');
    var m = errorSpans.length;
    for (var k = 0; k < m; k++) {
        errorSpans[0].parentNode.removeChild(errorSpans[0]);
    }

    hideFeedBack(form);
    scrollerBot.reset();
}

var errorDescriptionSpan = document.createElement('div');
errorDescriptionSpan.className = "form-error-content";

function displayError(node, errorMsg) {
    node.classList.add('form-error');
    setErrorSpan(node, errorMsg);
}

function setErrorSpan(node, errorMsg) {
    var errorSpan = errorDescriptionSpan.cloneNode();
    errorSpan.innerHTML = errorMsg;

    insertAfter(errorSpan, node);
    scrollerBot.toTopmostNode($(node));
}

function showFeedback(err, msg, feedBackHolder) {
    feedBackHolder = !feedBackHolder ? document.getElementById('feedback-holder') : feedBackHolder;
    if (!feedBackHolder) return;
    if (err) {
        feedBackHolder.classList.remove('w-form-done');
        feedBackHolder.classList.add('w-form-fail');
    }
    else {
        feedBackHolder.classList.remove('w-form-fail');
        feedBackHolder.classList.add('w-form-done');
    }
    feedBackHolder.innerHTML = msg;
    feedBackHolder.style.display = 'block';
}

function hideFeedBack(form) {
    if (form) feedBackHolder = form.getElementsByClassName('feedback-holder')[0];
    feedBackHolder = !feedBackHolder ? document.getElementById('feedback-holder') : feedBackHolder;
    if (!feedBackHolder) return;

    feedBackHolder.style.display = 'none';
}

function insertAfter(newElem, refElem) {
    refElem.parentNode.insertBefore(newElem, refElem.nextSibling);
}

function scrollToElement(target) {
    $('html, body').animate({
        scrollTop: target.offset().top - 40
    }, 1000);
}

function ScrollerBot() {
    this.current = null;

    this.toTopmostNode = function (node) {
        var offset = node.offset();

        if (this.current === null || this.current > offset.top) {
            scrollToElement(node);
            this.current = offset.top;
        }
    }

    this.reset = function () {
        this.current = null;
    }
}
var scrollerBot = new ScrollerBot();

function goToSignIn() {
    localStorage.setItem('farmforte-signin-redirect', window.location.href);
    window.location.href = '/login';
}

function goToLoginPrompt() {
    window.location.href = '/login-prompt';
}

function logout() {
    authBot.unsetToken();
    window.location.href = '/login';
}

function getWallet() {
    var loader = new ButtonLoader(document.getElementById('button-next'));
    loader.setLoader();

    getData('/user/wallet', true, function (status, data) {
        if (!status) {
            showFeedback(true, "Connection failed.");
        }
        else if (status == 200) {
            store.wallet.balance = data.wallet.funds + data.wallet.bonus.balance;
            //store.wallet = {balance: 500000, ledger: 500000};
        }
        else if (status == 401) {
            goToSignIn();
        }
        else if (status == 500) {
            showFeedback(true, "Oops! Something went wrong. Please try again later");
        }
        loader.removeLoader();
    });
}

function initFacebookSignup(node, type) {
    var loader = new ButtonLoader(node);
    loader.setLoader();

    // FB.getLoginStatus(function(response) {
    // 	if(response.status == "connected") facebookSignup(response.authResponse.accessToken, loader);
    // 	else{
    // 		FB.login(function(response){
    // 			if(response.status == "connected") facebookSignup(response.authResponse.accessToken, loader);
    // 		}, {scope: 'public_profile,email'});
    // 	}
    // });

    FB.login(function (response) {
        if (response.status == "connected") {
            facebookSignup(response.authResponse.accessToken, loader, type)
        } else {
            loader.removeLoader();
        }
    }, { scope: 'public_profile,email' });
}

function facebookSignup(token, loader, type) {
    //redirect to place to enter referral (if actual signup)
    if (type !== 'login') {
        var setToken = localStorage.setItem('token', token);
        return window.location.href = '/set-referral';
    }

    postData('/user/facebook/signup', { token: token }, false, function (status, data) {
        if (!status) {
            showFeedback(true, "Connection failed.");
        }
        else if (status == 200) {
            setUserLoggedIn(data.token);
            return;
        }
        else if (status == 400) {
            for (var key in data) {
                displayError(form.getElementsByClassName(key)[0], data[key]);
            }
        }
        else if (status == 500) {
            showFeedback(true, "Oops! Something went wrong. Please try again later");
        }

        loader.removeLoader();
    });
}

function setUserLoggedIn(token) {
    authBot.setToken(token);
    var redirect = localStorage.getItem('farmforte-signin-redirect');
    localStorage.removeItem('farmforte-signin-redirect')
    window.location.href = redirect ? redirect : '/dashboard';
}

function parseQueryString() {
    var Params = new Object();
    var qs = window.location.href.replace(/^[^\?]+\??/, '');
    if (qs.trim() != "") {
        var Pairs = qs.split(/[;&]/);
        for (var i = 0; i < Pairs.length; i++) {
            var KeyVal = Pairs[i].split('=');
            if (!KeyVal || KeyVal.length != 2) continue;
            var key = unescape(KeyVal[0]);
            var val = unescape(KeyVal[1]);
            val = val.replace(/\+/g, ' ');
            Params[key] = val;
        }
    }
    return Params;
}
