# maskedinput-nojquery

This is literally a copy of [jquery.maskedinput](https://github.com/excellalabs/jquery.maskedinput), but without the dependency on jquery.

# Slightly different API

## maskedinput.mask()
### Arguments:
1. HTMLElement or NodeList
2. Mask (same as first argument of `$().mask()`)
3. Options (optional, same as second argument of `$().mask()`)

Usage Example:
```
maskedinput.mask(document.getElementById('phone'), '999-999-9999', { autoclear: false });
```

## maskedinput.unmask()
### Arguments:
1. HTMLElement or NodeList

Usage Example:
```
maskedinput.unmask(document.getElementsByClassName('phones'));
```

## maskedinputVars.definitions (mutable)

Usage Example:
```
maskedinputVars.definitions['~']='[+-]';
maskedinput.mask(document.getElementById('masked-input'), "~9.99 ~9.99 999");
```

# Notes
I did this to keep myself occupied on a flight from London to Salt Lake City. It seems like this works like the original library, but if I missed something (which I probably did...) feel free to add an issue or a pull request.
