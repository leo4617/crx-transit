var options = {
    notifyTimeout: 5,     // 页面划词结果显示时间
    pageInspect: true,    // 是否启用页面划词
    linkInspect: true,    // 是否启用链接划词
    pushItem: false,      // 是否推送单词到服务端,
    notifyMode: 'margin', // 结果默认显示在右上角
};

// TransIt 通用函数
var TPLS = {
    SUCCESS:     '<div class="success">#{1}</div>',
    WARNING:     '<div class="warning">#{1}</div>',
    LOADING:     '<div class="success">正在翻译 <strong>#{1} ...</strong></div>',
    TITLE:       '<h6>#{1}</h6>',
    NOTIFY:      '<div class="transit-notify">#{1}</div>',
    PHONETIC:    '[<code>#{1}</code>]<br/>'

};

function fmt() {
    var args = arguments;
    return args[0].replace(/#{(.*?)}/g, function(match, prop) {
        return function(obj, props) {
            var prop = /\d+/.test(props[0]) ? parseInt(props[0]) : props[0];
            if (props.length > 1) {
                return arguments.callee(obj[prop], props.slice(1));
            } else {
                return obj[prop];
            }
        }(typeof args[1] === 'object' ? args[1] : args, prop.split(/\.|\[|\]\[|\]\./));
    });
}

function log() {
    var message = Array.prototype.slice.call(arguments, 0);
    console.log.apply(console, ['[transit]'].concat(message));
}


// 从 storage 中读取配置，如果没有配置，则初始化为默认值
function initOptions(callback) {
    chrome.storage.sync.get(null, function(data) {
        $.extend(options, data);
        chrome.storage.sync.set(options);
        callback && callback();
    });
}

// 监听设置项的变化
chrome.storage.onChanged.addListener(function(changes) {
    for (var name in changes) {
        var change = changes[name];
        options[name] = change.newValue;
        log(fmt('#{1}: #{2} => #{3}', name, change.oldValue, change.newValue));
    }
});

// 从查询结果中提取出翻译结果
function getTranslation(result) {
    var translation = null;
    if (result && !result.errorCode) {
        if (result.basic) {
            translation = result.basic.explains.join('<br/>');
            if (result.basic.phonetic) {
                translation = fmt(TPLS.PHONETIC, result.basic.phonetic) + translation;
            }
        } else if (result.translation) {
            translation = result.translation.join('<br />');
        }
        
        if (translation.toLowerCase() == result.query.toLowerCase()) {
            translation = null;
        }
    }

    return translation;
}

function registerMessageDispatcher(dispatcher) {
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            var handler = dispatcher[request.type] || noop;
            handler(request, sender, sendResponse);

            return true;
        }
    );    
}

function talkToPage(tabId, message, callback) {
    if (tabId) {
        chrome.tabs.sendMessage(tabId, message, callback);  
    } else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            talkToPage(tabs[0].id, message, callback);
        });
    }
}
