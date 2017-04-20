function Prelexer() {

  function firstCharToUpper(s) {
    if(!(s.length > 0)) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function firstCharToLower(s) {
    if(!(s.length > 0)) return s;
    return s.charAt(0).toLowerCase() + s.slice(1);
  }

  var p =  { // Public interface 
    tokenize : function(text) {
      return text.split(/\s+/);
    },

    tokens_start : function(text) {
      var tokens = this.tokenize(text);
      var ret = [];
      var n = 0;
      for(i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        ret.push({token: t, start: n, end: n + t.length});
        n += t.length; // Add length of token 
        n += 1; // Add length of space
      }
      return ret;
    },

    normalize : function(text) {
      var tokens = this.tokenize(text);

      // Remove empty first element.
      if(tokens.length >= 2 && tokens[0] == "") {
        tokens.splice(0,1); 
      }

      // Upper case first letter
      if(tokens.length >= 1) {
        tokens[0] = firstCharToUpper(tokens[0]);
      }

      // Join by spaces
      var outString = tokens.join(" ");

      // Add space at end, if it was there
      if(tokens[tokens.length-1] == "") {
        outString += " ";
      }

      return outString;
    },

    prelex: function(text) {
      // Strip optional ending period
      text = text.replace(/\s*\.\s*$/, "");

      var tokens = this.tokenize(text);

      // Remove empty first element.
      if(tokens.length >= 2 && tokens[0] == "") {
        tokens.splice(0,1); 
      }
 
      // Lower case first letter
      if(tokens.length >= 1) {
        tokens[0] = firstCharToLower(tokens[0]);
      }

      var outString = tokens.join(" ");
      return outString;
    },

  };

  return p;
}
