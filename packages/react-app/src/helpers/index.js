export { default as Transactor } from "./Transactor";
export { default as ipfs } from "./ipfs";


export function standardizeLink (link) {  
    if (link) {
        link = link.replace("ipfs://ipfs/", "https://ipfs.io/ipfs/")
        return link.replace("ipfs://", "https://ipfs.io/ipfs/");
    } else {
        return "";
    }
  };

  export function ipfsLinkFromHash(hash) {
      return "https://ipfs.io/ipfs/"+hash;
  }

  export function getURLParam(param) {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    return urlParams.get(param);
  }


  export function getHashURLParam(param) {
      if (window.location.toString().includes(param)) {
        return window.location.toString().split(param+"=")[1];
        /*  wont work if its not the last param*/
      } else {
        return null;
      }
  }


export function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);
    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {type:mimeString});
    }