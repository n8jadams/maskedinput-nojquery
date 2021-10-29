// CustomEvent polyfill for IE
(function () {

  if ( typeof window.CustomEvent === "function" ) return false;

  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: null };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
   }

  window.CustomEvent = CustomEvent;
})();
(function (win) {

  var ua = navigator.userAgent,
    iPhone = /iphone/i.test(ua),
    chrome = /chrome/i.test(ua),
    android = /android/i.test(ua),
    caretTimeoutId;

  win.maskedinputVars = {
    // Predefined character definitions
    definitions: {
      '9': "[0-9]",
      'a': "[A-Za-z]",
      '*': "[A-Za-z0-9]"
    },
    autoclear: true,
    dataName: "rawMaskFn",
    placeholder: '_'
  };

  function domNodesToArray(elements) {
    if (!elements && !!elements.length) {
      return false;
    }

    if(
      elements instanceof NodeList || 
      elements instanceof HTMLCollection  
    ) {
      return Array.prototype.slice.call(elements);
    }
    
    return [elements];
  }

  function oneTimeEvent(element, eventType, callback) {
    element.addEventListener(eventType, function(e) {
      e.target.removeEventListener(e.type, arguments.callee);
      return callback(e);
    });
  }

  function maskEvent(event) {
    var input = event.target;
    if(input.getAttribute('readonly')) {
      return;
    }

    clearTimeout(caretTimeoutId);
    var pos;

    focusText = input.value;

    pos = checkVal();

    caretTimeoutId = setTimeout(function () {
      if (!input) {
        return;
      }
      writeBuffer();
      if (pos == mask.replace("?", "").length) {
        win.maskedinput.caret(input, 0, pos);
      } else {
        win.maskedinput.caret(input, pos);
      }
    }, 10);
  }

  win.maskedinput = {
    // Helper Function for Caret positioning
    caret: function (element, begin, end) {
      var range;

      if (!element) {
        return;
      }

      if (typeof begin == 'number') {
        end = (typeof end === 'number') ? end : begin;
        
        if (element.setSelectionRange) {
          element.setSelectionRange(begin, end);
        } else if (element.createTextRange) {
          range = element.createTextRange();
          range.collapse(true);
          range.moveEnd('character', end);
          range.moveStart('character', begin);
          range.select();
        }
      } else {
        if (element.setSelectionRange) {
          begin = element.selectionStart;
          end = element.selectionEnd;
        } else if (document.selection && document.selection.createRange) {
          range = document.selection.createRange();
          begin = 0 - range.duplicate().moveStart('character', -100000);
          end = begin + range.text.length;
        }
        return { begin: begin, end: end };
      }
    },
    unmask: function (elements) {
      elements = domNodesToArray(elements);
      if(!elements) {
        return;
      }

      elements.forEach(function(input) {
        var changeEvent = new CustomEvent('unmask');
        input.dispatchEvent(changeEvent);
      });
    },
    mask: function (elements, mask, settings) {

      var input,
        defs,
        tests,
        partialPosition,
        firstNonMaskPos,
        lastRequiredNonMaskPos,
        len,
        oldVal;

      elements = domNodesToArray(elements);
      if(!elements) {
        return;
      }

      if (!mask && elements.length > 0) {
        input = elements[0];
        var fn = input.data(win.maskedinputVars.dataName)
        return fn ? fn() : undefined;
      }

      if(!settings) {
        settings = {};
      }
      settings.autoclear = win.maskedinputVars.autoclear;
      // Load default placeholder
      settings.placeholder = win.maskedinputVars.placeholder;
      settings.completed = null;

      defs = win.maskedinputVars.definitions;
      tests = [];
      partialPosition = len = mask.length;
      firstNonMaskPos = null;

      mask = String(mask);

      mask.split("").forEach(function (c, i) {
        if (c == '?') {
          len--;
          partialPosition = i;
        } else if (defs[c]) {
          tests.push(new RegExp(defs[c]));
          if (firstNonMaskPos === null) {
            firstNonMaskPos = tests.length - 1;
          }
          if (i < partialPosition) {
            lastRequiredNonMaskPos = tests.length - 1;
          }
        } else {
          tests.push(null);
        }
      });

      elements.forEach(function(input) {
        var changeEvent = new CustomEvent('unmask');
        input.dispatchEvent(changeEvent);
        var buffer = mask.split('').map(function(c, i) {
          if (c != '?') {
            return defs[c] ? getPlaceholder(i) : c;
          }
        }).filter(function(p) {
          if(p === undefined || p === null) {
            return false;
          }
          return true;
        });
        var defaultBuffer = buffer.join('');
        var focusText = input.value;

        function tryFireCompleted() {
          if (!settings.completed) {
            return;
          }

          for (var i = firstNonMaskPos; i <= lastRequiredNonMaskPos; i++) {
            if (tests[i] && buffer[i] === getPlaceholder(i)) {
              return;
            }
          }
          settings.completed.call(input);
        }

        function getPlaceholder(i) {
          if (i < settings.placeholder.length)
            return settings.placeholder.charAt(i);
          return settings.placeholder.charAt(0);
        }

        function seekNext(pos) {
          while (++pos < len && !tests[pos]);
          return pos;
        }

        function seekPrev(pos) {
          while (--pos >= 0 && !tests[pos]);
          return pos;
        }

        function shiftL(begin, end) {
          var i,
            j;

          if (begin < 0) {
            return;
          }

          for (i = begin, j = seekNext(end); i < len; i++) {
            if (tests[i]) {
              if (j < len && tests[i].test(buffer[j])) {
                buffer[i] = buffer[j];
                buffer[j] = getPlaceholder(j);
              } else {
                break;
              }

              j = seekNext(j);
            }
          }
          writeBuffer();
          win.maskedinput.caret(input, Math.max(firstNonMaskPos, begin));
        }

        function shiftR(pos) {
          var i,
            c,
            j,
            t;

          for (i = pos, c = getPlaceholder(pos); i < len; i++) {
            if (tests[i]) {
              j = seekNext(i);
              t = buffer[i];
              buffer[i] = c;
              if (j < len && tests[j].test(t)) {
                c = t;
              } else {
                break;
              }
            }
          }
        }

        function androidInputEvent() {
          var curVal = input.value;
          var pos = win.maskedinput.caret(input);
          if (oldVal && oldVal.length && oldVal.length > curVal.length) {
            // a deletion or backspace happened
            checkVal(true);
            while (pos.begin > 0 && !tests[pos.begin - 1])
              pos.begin--;
            if (pos.begin === 0) {
              while (pos.begin < firstNonMaskPos && !tests[pos.begin])
                pos.begin++;
            }
            win.maskedinput.caret(input, pos.begin, pos.begin);
          } else {
            var pos2 = checkVal(true);
            var lastEnteredValue = curVal.charAt(pos.begin);
            if (pos.begin < len) {
              if (!tests[pos.begin]) {
                pos.begin++;
                if (tests[pos.begin].test(lastEnteredValue)) {
                  pos.begin++;
                }
              } else {
                if (tests[pos.begin].test(lastEnteredValue)) {
                  pos.begin++;
                }
              }
            }
            win.maskedinput.caret(input, pos.begin, pos.begin);
          }
          tryFireCompleted();
        }


        function blurEvent(e) {
          checkVal();

          if (input.value != focusText) {
            var changeEvent = new CustomEvent('change');
            input.dispatchEvent(changeEvent);
          }
        }

        function keydownEvent(e) {
          if (input.getAttribute("readonly")) {
            return;
          }

          var k = e.which || e.keyCode,
            pos,
            begin,
            end;
          oldVal = input.value;
          // backspace, delete, and escape get special treatment
          if (k === 8 || k === 46 || (iPhone && k === 127)) {
            pos = win.maskedinput.caret(input);
            begin = pos.begin;
            end = pos.end;

            if (end - begin === 0) {
              begin = k !== 46 ? seekPrev(begin) : (end = seekNext(begin - 1));
              end = k === 46 ? seekNext(end) : end;
            }
            clearBuffer(begin, end);
            shiftL(begin, end - 1);

            e.preventDefault();
          } else if (k === 13) { // enter
            blurEvent.call(this, e);
          } else if (k === 27) { // escape
            input.value = focusText;
            win.maskedinput.caret(input, 0, checkVal());
            e.preventDefault();
          }
        }

        function keypressEvent(e) {
          if (input.getAttribute("readonly")) {
            return;
          }

          var k = e.which || e.keyCode,
            pos = win.maskedinput.caret(input),
            p,
            c,
            next;

          if (e.ctrlKey || e.altKey || e.metaKey || k < 32) {//Ignore
            return;
          } else if (k && k !== 13) {
            if (pos.end - pos.begin !== 0) {
              clearBuffer(pos.begin, pos.end);
              shiftL(pos.begin, pos.end - 1);
            }

            p = seekNext(pos.begin - 1);
            if (p < len) {
              c = String.fromCharCode(k);
              if (tests[p].test(c)) {
                shiftR(p);

                buffer[p] = c;
                writeBuffer();
                next = seekNext(p);

                if (android) {
                  // Path for CSP Violation on FireFox OS 1.1
                  var proxy = function () {
                    $.proxy($.fn.caret, input, next)();
                  };

                  setTimeout(proxy, 0);
                } else {
                  win.maskedinput.caret(input, next);
                }
                if (pos.begin <= lastRequiredNonMaskPos) {
                  tryFireCompleted();
                }
              }
            }
            e.preventDefault();
          }
        }

        function inputEvent(e) {
          var input = e.target;
          if (input.getAttribute("readonly")) {
            return;
          }

          setTimeout(function () {
            var pos = checkVal(true);
            win.maskedinput.caret(input, pos);
            tryFireCompleted();
          }, 0);
        }

        function clearBuffer(start, end) {
          var i;
          for (i = start; i < end && i < len; i++) {
            if (tests[i]) {
              buffer[i] = getPlaceholder(i);
            }
          }
        }

        function writeBuffer() { input.value = buffer.join(''); }

        function checkVal(allow) {
          // try to place characters where they belong
          var test = input.value,
            lastMatch = -1,
            i,
            c,
            pos;

          for (i = 0, pos = 0; i < len; i++) {
            if (tests[i]) {
              buffer[i] = getPlaceholder(i);
              while (pos++ < test.length) {
                c = test.charAt(pos - 1);
                if (tests[i].test(c)) {
                  buffer[i] = c;
                  lastMatch = i;
                  break;
                }
              }
              if (pos > test.length) {
                clearBuffer(i + 1, len);
                break;
              }
            } else {
              if (buffer[i] === test.charAt(pos)) {
                pos++;
              }
              if (i < partialPosition) {
                lastMatch = i;
              }
            }
          }
          if (allow) {
            writeBuffer();
          } else if (lastMatch + 1 < partialPosition) {
            if (settings.autoclear || buffer.join('') === defaultBuffer) {
              // Invalid value. Remove it and replace it with the
              // mask, which is the default behavior.
              if (input.value) {
                input.value = "";
              }
              clearBuffer(0, len);
            } else {
              // Invalid value, but we opt to show the value to the
              // user and allow them to correct their mistake.
              writeBuffer();
            }
          } else {
            writeBuffer();
            input.value = input.value.substring(0, lastMatch + 1);
          }
          return (partialPosition ? i : firstNonMaskPos);
        }

        input.dataset[win.maskedinputVars.dataName] = buffer.map(function(c, i) {
          return tests[i] && c != getPlaceholder(i) ? c : null;
        }).filter(function(p) {
          if(p === undefined || p === null) {
            return false;
          }
          return true;
        }).join('');

        oneTimeEvent(input, 'unmask', function(event) {
          event.target.removeEventListener('mask', maskEvent);
          event.target.removeEventListener('blur', blurEvent);
          event.target.removeEventListener('keydown', keydownEvent);
          event.target.removeEventListener('keypress', keypressEvent);
          if (chrome && android) {
            event.target.removeEventListener('input', androidInputEvent);
          } else {
            event.target.removeEventListener('input', inputEvent);
          }

          event.target.dataset[win.maskedinputVars.dataName] = null;
        });

        input.addEventListener('mask', maskEvent);
        input.addEventListener('blur', blurEvent);
        input.addEventListener('keydown', keydownEvent);
        input.addEventListener('keypress', keypressEvent);
        if (chrome && android) {
          input.addEventListener('input', androidInputEvent);
        } else {
          input.addEventListener('input', inputEvent);
        }
        
        checkVal(); // Perform initial check for existing values
      });
    }
  }
})(window);