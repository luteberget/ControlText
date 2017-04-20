var prelexer = Prelexer();
var content = document.getElementById("content");
var mySpacer = document.getElementById("measure");
//var menuStatusDiv = document.getElementById("menustatus");
var allCategories;

var startCat = "Statement";
var chunksCat = "Chunks";

function arraysEqual(a1,a2) {
    /* WARNING: arrays must not contain {objects} or behavior may be undefined */
    return JSON.stringify(a1)==JSON.stringify(a2);
}


// function setMenuStatus(t) {
//   menuStatusDiv.innerHTML = String(t); 
// }

 
    function splitLine(value) {
          var split = value.split(" ");
          var prefix;

          //    if(split[split.length-1].endsWith(" ")) 
          if(split[split.length-1] != split[split.length-1].trim()) {
            split[split.length-1] = split[split.length-1].trim();
            prefix = "";
          } else {
            prefix = split.pop();
          }
          var line = split.join(" ");
          return {line:line,prefix:prefix};
    }

function onCursorPositionChanged() {
  console.log("CURSOR MOVED");
}

function append_example_fun(funname) {
  console.log("-<-<- append example fun");
  var newExpr = create_example_funname(funname, []);
  var lisp = expr_to_lisp(newExpr);
  console.log(lisp);
  console.log("-<-<- linearizing text");
  var lin = Module.x_cnl_linearize_string(lisp);
  console.log(lin);
  console.log("-<-<- replacing text");
  menu.setText(menu.getText() + lin);
  menu.onChange(menu.getText());
}

function find_transformations(fid, fromFun, toCat) {
  console.log("Searching for transformations on node FID" + fid  + " from " + fromFun + " to " + toCat);

  var ret = [];
  var fromFunInfo;
  for(var i = 0; i < funs.length; i++) {
    var fun = funs[i];
    if(fun.name == fromFun) fromFunInfo = fun;
  }
  if(fromFunInfo === undefined || fromFunInfo.args === undefined) return ret;

  var givenSubExprs = [];
  for(var i = 0; i < fromFunInfo.args.length; i++) {
    givenSubExprs.push(fromFunInfo.args[i]);
  }

  for(var i = 0; i < funs.length; i++) {
    var fun = funs[i];
    console.log("trying " + fun.name);
    if(fun.cat != toCat) { console.log("not a " + toCat);continue;}
    if(fun.name == fromFun) continue;
    //if(!arraysEqual(fromFunInfo.args, fun.args)) continue;
    console.log("accepting " + fun.name);

    // calculate score
    var score = 0;
    for(var j = 0; j < fun.args.length; j++) {
      var found = -1;
      for(var k = 0; k < givenSubExprs.length; k++) {
        if(givenSubExprs[k] == fun.args[k]) {
          found = k;
        }
      }
      if(found > -1) {
        givenSubExprs.splice(found,1);
      } else {
        score -= 1;
      }
    }
    score -= 2*givenSubExprs.length;
    var x = { name: fun.name, fid: fid, score:score };

    console.log("scored function:");
    console.log(x);
    ret.push(x);
  }
  return ret;
}

function get_fid(expr, fid) {
  var n = -1;
  var retval = null;
  var doit = function rec(x) {
    if(x.type == "apply") {
      for(var i = 0; i < x.args.length; i++) {
        rec(x.args[i]);
      }
    }

    // FID seems to be parse tree constructors 
    // numbered by post-order traversal
    n++;

    if(n == fid) {
      retval = x;
    }
  }
  doit(expr);
  return retval;
}

function get_category(funname) {
  console.log("get_category " + funname);
  for(var i = 0; i < funs.length; i++) {
    if(funs[i].name === funname) return funs[i].cat;
  }

  console.log("NOT FOUND");

  return null;
}

// First try: if there is an alternative 
// constructor with the exact thing, then
// use that. If not, try recursing to subtrees.
// TODO: expand to scoring alternatives
function inject_argument(main, sub) {
  var mainCat = get_category(main.fun);
  if(mainCat == null) return "error";
  var subCat = get_category(sub.fun);
  if(subCat == null) return "error";

  var start = [main];
  var n = 0;
  while(n < 10) {
    // try Start
    console.log("Trying  subst. with ");
    console.log(start);
    for(var i = 0; i < start.length; i++) {
      var topExpr = start[i];
      if(topExpr.type != "apply") continue;
      var cat = get_category(topExpr.fun);
      var baseCats = [];
      for(var j = 0; j < topExpr.args.length; j++) {
        var c = get_category(topExpr.args[j].fun);
        if(c != undefined) {
          baseCats.push({ cat: c, index: j });
        } else {
          
        }
      }
      for(var j = 0; j < funs.length; j++) {
        var candFun = funs[j];
        var candArgs = [];
        if(candFun.cat == cat) {
          for(var k = 0; k < candFun.args.length; k++) { 
            var argCat = candFun.args[k];

            var foundArg = false;
            // Try original arguments
            for(var l = 0; !foundArg && l < baseCats.length; l++) {
              var baseCat = baseCats[l];
              if(baseCat.cat == argCat) {
                candArgs.push(topExpr.args[baseCat.index]);
                foundArg = true;
              }
            }

            // Try subtree to be merged as argument
            if(!foundArg && argCat == subCat) {
              candArgs.push(sub);
            }

          }
        }

        if(candArgs.length == baseCats.length +1) {
          console.log("FOUND IT!");
          return {topExpr: topExpr, fun: candFun, args: candArgs};
        }
      }
    }

    // else, try subtreea
    var nextStart = [];
    for(var i = 0; i < start.length; i++) {
      var topExpr = start[i];
      if(topExpr.type != "apply") continue;
      for(var j = 0; j < topExpr.args.length; j++) {
        nextStart.push(topExpr.args[j]);
      }
    }
    start = nextStart;

    n += 1;
  }

  console.log("inject into category " + mainCat + " " + subCat);
  
}

function get_chunk_contents(expr) {
  return expr.args[0];
}

function set_to_expr(result) {
  console.log(result);
  var lisp = expr_to_lisp(result);
  console.log(lisp);
  console.log("-<-<- linearizing text");
  var lin = Module.x_cnl_linearize_string(lisp);
  console.log(lin);
  console.log("-<-<- replacing text");
  menu.setText(lin);
  menu.onChange(lin);
}


function do_subst(expr, subst) {
  if(expr.fun == subst.topExpr.fun) {
    return { type: "apply", 
             n: subst.args.length,
             fun: subst.fun.name, 
             args: subst.args };
  } else {
    if(expr.type != "apply") return expr;
    for(var i = 0; i < expr.args.length; i++) {
      expr.args[i] = do_subst(expr.args[i], subst);
    }

    return expr;
  }
}

function delete_chunk(expr, chunk) {
  // We should have multiple chunks, so consider only PlusChunks
  console.log("DELETE CHUNK FROM ");
  console.log(expr);
  console.log(expr_to_lisp(expr));
  console.log(chunk);
  if(expr.fun == "PlusChunk") {
    if(expr.args[0].fun == chunk.fun) {
      return expr.args[1];
    } else {
      if(expr.args[1].fun == "PlusChunk") {
        expr.args[1] = delete_chunk(expr.args[1], chunk);
      } else { 
        // Must be OneChunk
        // TODO: convert to Cons/Nil to avoid this special case

        if(expr.args[1].args[0].fun == chunk.fun) {
          console.log("DELETING ONECHUNK");
          expr.fun = "OneChunk";
          expr.args.splice(1,1);
        }
      }
    }
  }

  return expr;
}

function merge_chunks(expr, from, to) {
  console.log("starting merge");
  var subChunk = get_chunk_contents(get_fid(expr, from.fid));
  var mainChunk = get_chunk_contents(get_fid(expr, to.fid));
  var subst = inject_argument(mainChunk, subChunk);
  if(subst !== undefined) {
    console.log("DO SUBST");
    console.log(subst);
 
    expr = do_subst(expr, subst);
    expr = delete_chunk(expr, from);
    console.log(expr_to_lisp(expr));
    console.log("DONE MERGE");
    set_to_expr(expr);

  }
}

function mk_ast_transform(bracket, brackets, cat) {
  // Somehow find good tranformations from the selected bracket (AST node).
  var transforms = find_transformations(bracket.fid, bracket.fun, bracket.cat);

  return {
// &#11136; 
    name: "&#x21c4; " + cat.name,
    renderHeader: function() { return this.name; },
    items: transforms,
    render: function(j) { return this.items[j].name + " (" + this.items[j].score + ")"; },
    execute: function(j) { 
      //console.log("swapping at fid " + this.items[j].fid + " to " + this.items[j].name);
      swap_current(this.items[j].fid, this.items[j].name);
    },
  };
}


function find_ast_node_transforms(text, brackets) {
  var ret = [];
  var tokens = prelexer.tokens_start(text);
  var cursor = menu.input.selectionStart;
  console.log("find ast node transforms brackets cursor: " + String(cursor));
  if(!(cursor >= 0)) return ret;
  for(var i = 0; i < brackets.size(); i++) {
     bracket = brackets.get(i);
     if(!(bracket.start < bracket.end)) continue;	

     var startChar = tokens[bracket.start].start;
     var endChar = tokens[bracket.start].end;
     if(!(startChar <= cursor && endChar-1 >= cursor)) continue;

     console.log(bracket);
     for(var j = 0; j < visCats.length; j++) {
       var cat = visCats[j];
       if(bracket.cat == cat.name) {
        console.log("TRANFORM ON  " + bracket.cat);
        ret.push(mk_ast_transform(bracket, brackets, cat));
        console.log(ret);
       }
     }
  }

  return ret;
}

function mk_new_node(viscat) {
  var items = [];
  for(var i = 0; i < funs.length; i++) {
    var fun = funs[i];
    if(fun.cat == viscat.name) items.push(fun);
  }

  return {
    name: "&#x2726; " + viscat.name,
    renderHeader: function() { return this.name; },
    items: items,
    render: function(j) { return this.items[j].name; },
    execute: function(j) { 
      //console.log("swapping at fid " + this.items[j].fid + " to " + this.items[j].name);
      //swap_current(this.items[j].fid, this.items[j].name);
      //console.log("append expression to input");
      append_example_fun(this.items[j].name);
    },
  };
}

function find_merge_nodes(text, brackets) {
  var ret = [];
  var cursor = menu.input.selectionStart;
  console.log("find merge nodes, cursor: " + String(cursor));
  if(!(cursor >= 0)) return ret;

  var allNodes = [];
  for(var i = 0; i < brackets.size(); i++) {
     bracket = brackets.get(i);
     if(bracket.cat == "Chunk" && bracket.fun != "UnknownChunk") {
       allNodes.push(bracket);
     }
  }

  console.log("CUNKS:");
  console.log(allNodes);

  var tokens = prelexer.tokens_start(text);
  var items = [];
  for(var i = 0; i < allNodes.length; i++) {
     bracket = allNodes[i];
     console.log("NOw trying inside " + JSON.stringify(bracket));
     if(!(bracket.start < bracket.end)) continue;	

     var startChar = tokens[bracket.start].start;
     var endChar = tokens[bracket.start].end;
     if(!(startChar <= cursor && endChar-1 >= cursor)) continue;

     // Inside 

     console.log("NOw inside " + JSON.stringify(bracket));

     for(var j = 0; j < allNodes.length; j++) {
       if(allNodes[j].fun != bracket.fun) {
         items.push({ from: bracket, to: allNodes[j]});
       }
     }
  }

  console.log("MERGE ITEMS");
  console.log(items);

  ret.push( {
    name: "&#x21e4; Merge chunks",
    renderHeader: function() { return this.name; },
    items: items,
    render: function(j) { return this.items[j].from.fun + " into " + this.items[j].to.fun },
    execute: function(j) { 
       merge_chunks(last_result.result, this.items[j].from, this.items[j].to);
    },
  });

  return ret;
}

function find_new_nodes(brackets) {
  var ret = [];
  var startCatExists = false;
  for(var i = 0; i < brackets.size(); i++) {
     bracket = brackets.get(i);
     if(bracket.cat == startCat) startCatExists = true;
  }

  if(!startCatExists) {
      //ret.push(mk_new_node(visCats[0]));
    for(var i = 0; i < visCats.length; i++) {
      ret.push(mk_new_node(visCats[i]));
    }
  }

  return ret;
}

function createPositional() {
  var pos = menu.input.selectionStart;
  var ret = [];
  if(last_result != null) {
    var node_transforms = find_ast_node_transforms(menu.getText(), last_result.brackets);
    ret = ret.concat(node_transforms);
    var new_nodes = find_new_nodes(last_result.brackets);
    ret = ret.concat(new_nodes);

    if(last_parser === chunksCat) {
      var merge_nodes = find_merge_nodes(menu.getText(), last_result.brackets);
      ret = ret.concat(merge_nodes);
    }
  }

  return ret;
}

var compl_words = [];
var menu = MkMenu(content, {promptInnerHTML: '&gt;&gt;&gt;'});
menu.onChange = function(text) {
  console.log("halo xx " + text);
  Module.print("halo " + text);
  update(text);
  var len = splitLine(text).line.length;
  if(len > 0) len += 1;
  Module.print("Starting from " + len);
  menu.startFrom = len;
  menu.options = compl_words;
  menu.otherOptions = createPositional();
  //setMenuStatus("textchanged  -- " + String(menu.options) + " -- " + String(menu.otherOptions));
  menu.repaint();
};

menu.onCursorChange = function() {
  console.log("CURSOR" + String(menu.input.selectionStart));
  menu.otherOptions = createPositional();
  //setMenuStatus("cursorchanged  -- " + String(menu.options) + " -- " + String(menu.otherOptions));
  menu.repaint();
};

/*
var cursor_position = 0;
$(menu.input).on("keydown click focus", function() {
  // Check if cursor position has changed.
  if(menu.input.selectionStart != cursor_position) {
    onCursorPositionChanged();
    cursor_position = menu.input.selectionStart;
  }
});
*/

var svg = d3.select("svg");
// var path = d3.select("svg").append("path").attr("class","curlyBrace");
var getText = menu.getText;

function expr_to_lisp(expr, toplevel) {
  if(typeof(toplevel) === 'undefined') toplevel = true;
  if(expr.type == "intlit") return String(expr.value);
  if(expr.type == "fltlit") return String(expr.value);
  if(expr.type == "strlit") return "\"" + String(expr.value) + "\"";
  if(expr.type == "apply") {
    var retval = "";
    if(expr.args.length > 0 && !toplevel) retval += "(";
    retval += expr.fun;
    for(var i = 0; i < expr.args.length; i++) retval += " " + expr_to_lisp(expr.args[i],false);
    if(expr.args.length > 0 && !toplevel) retval += ")";
    return retval;
  }
  return undefined;
}

function swap_constructor(expr, fid, name) {
  var n = -1;
  var doit = function rec(x) {

    //if(expr.type == "intlit" || expr.type == "fltlit" || expr.type == "strlit")
    if(x.type == "apply") {
      for(var i = 0; i < x.args.length; i++) {
        x.args[i] = rec(x.args[i]);

      }
    }

    // FID seems to be parse tree constructors 
    // numbered by post-order traversal
    n++;

    if(n == fid) {
      return create_example_funname(name, x.args);
    } else {
      return x;
    }
  }
  return doit(expr);
}


function fun_by_name(funname) {
  for(var i = 0; i < funs.length; i++) 
    if(funs[i].name == funname) return funs[i];
  return undefined;
}

function create_example_cat(cat) {
  if(cat == "String") return {type:"strlit", value:"x"};

  var subExprs = -1;
  var candidate = undefined;
  for(var i = 0; i < funs.length; i++) {
    var fun = funs[i];
    if(fun.cat == cat) {
      // Minimize the number of sub-expressions required
      if(subExprs == -1 || subExprs > fun.args.length) {
        subExprs = fun.args.length;
        candidate = {fun:fun};
      }
    }
  }

  if(candidate === undefined) return undefined;
  
  var expr = { type:"apply", fun: candidate.fun.name, args:[]};
  for(var i = 0; i < candidate.fun.args.length; i++) {
    var argType = candidate.fun.args[i];
    var argInstance = create_example_cat(argType);
    expr.args.push(argInstance);
  }

  return expr;
}

function create_example_fun(fun, originalArgs) {
  var expr = { type:"apply",fun:fun.name, args:[]};
  for(var i = 0; i < fun.args.length; i++) {
    // name, cat, args: list of cat names
    var argSpec = fun.args[i];

    var foundOrig = -1;
    for(var j = 0; j < originalArgs.length; j++) {
      var origArg = originalArgs[j];
      // find category of origArg
      for(var k = 0; k < funs.length; k++) {
        if(funs[k].name == origArg.fun && funs[k].cat == argSpec) {
          foundOrig = j;
        }
      }
    }

    if(foundOrig > -1) { // Argument already exists...
      expr.args.push(originalArgs[foundOrig]); // ... use it ...
      originalArgs.splice(foundOrig,1); // ... and remove it from the list
    } else {
      var newArg = create_example_cat(argSpec);
      expr.args.push(newArg);
    }
  }
  return expr;
}

function create_example_funname(funname, args) {
  return create_example_fun(fun_by_name(funname), args);
}


function swap_current(fid, name) {
  //var newText = Module.x_cnl_swap_current(fid,name);
  if(last_result.result.type != "apply") { // not a successful parse?
    console.log("no parse tree found for swapping");
    return;
  }

  var expr = last_result.result; 
  console.log("-<-<- starting swap: ");
  console.log(expr);

  var result = swap_constructor(expr, fid, name);

  set_to_expr(result);
}
 


    function textRects() {
      if(!(getText().length > 0)) {
      //console.log("returning emtpy array");
      return [];
      }
        var range = document.createRange();
      //console.log("selecting node contents");
        range.selectNodeContents(content);
      //console.log("yes " );
        return range.getClientRects();
    }

    var parse_fun = null;
    var last_result = null;
    var last_parser = null;
    var menu_left = 0;

    function textWidth(text) {
        // Used to encode an HTML string into a plain text.
        // taken from http://stackoverflow.com/questions/1219860/javascript-jquery-html-encoding
        mySpacer.innerHTML = String(text).replace(/&/g, '&amp;')
                                       .replace(/"/g, '&quot;')
                                       .replace(/'/g, '&#39;')
                                       .replace(/</g, '&lt;')
                                       .replace(/>/g, '&gt;');
        return mySpacer.getBoundingClientRect().right;
    }

var visCats = [
  {type:"brace", name:"Statement", color:"darkorange", up: true, level: 1},
  {type:"brace", name:"Subject", color:"darkblue", up: false, level: 1},
  {type:"brace", name:"GoalObject", color:"darkblue", up: false, level: 1},
  {type:"brace", name:"ConsequentCondition", color:"blue", up: false, level: 1},
  {type:"brace", name:"Area", color:"green", up: false, level: 0},
  {type:"brace", name:"RelationMultiplicity", color:"green", up: false, level: 0},
  {type:"brace", name:"Property", color:"purple", up: true, level: 0},
  {type:"brace", name:"Class", color:"purple", up: true, level: 0},
  {type:"brace", name:"DirectionalObject", color:"purple", up: true, level: 0},
  {type:"brace", name:"Restriction", color:"red", up: true, level: 0},
  {type:"brace", name:"Modality", color:"red", up: false, level: 0},
  {type:"underline", fun:"UnknownChunk", color: "red", thickness: 3},
  {type:"underline", name:"String", color: "gray", thickness: 2}
];



    function get_brackets_display(text, brackets) {
      var ret = [];
      var tokens = prelexer.tokens_start(text);
      for(i = 0; i < brackets.size(); i++) {
         bracket = brackets.get(i);
         if(!(bracket.start < bracket.end)) continue;	
         console.log(bracket);

         for(j = 0; j < visCats.length; j++) {

           var cat = visCats[j];
           //if(cat.type != "brace") continue;
           if(bracket.cat === cat.name || bracket.fun === cat.fun) {
            startChar = tokens[bracket.start].start;
            startX    = textWidth(getText().substring(0,startChar));
            var endX;
            if(bracket.end-1 >= tokens.length) { 
              endX   = textWidth(getText());
            } else {
              endChar   = tokens[bracket.end-1].end;
              endX      = textWidth(getText().substring(0,endChar));
            }
            ret.push({ type:cat.type,
                       color: cat.color, up: cat.up, level: cat.level,
                       name: bracket.fun,
                       start: startX, end: endX, startChar: startChar});
           }
         }
      }

      return ret;
    }

    function moveToChar(i) {
      menu.input.setSelectionRange(i,i);
      menu.input.focus();
    }

    function openMenu() {
    }

    function clear_vis() {
      svg.selectAll("path").remove();
      svg.selectAll("text").remove();
    }


    function update_underlines(disp, text, brackets) {
      var base = menu.input.getBoundingClientRect();
      for(i = 0; i < disp.length; i++) {
        var data = disp[i];
        if(data.type != "underline") continue;
        var left  = base.left + data.start;
        var right = base.left + data.end;
        var height = base.bottom +5;
        var p = "M " + left + " " + height + " L " + right + " " + height;
        console.log("ADDING UNDERLINE " + p );
        var path = svg.append("path").attr("class","underline");
        path.attr("stroke", data.color);
        path.attr("stroke-width", data.thickness);
        path.attr("d", p);
      }
    }

    function update_brackets(disp, text, brackets) {
      var base = menu.input.getBoundingClientRect();
      console.log("BASE");
      console.log(base);
      for(i = 0; i < disp.length; i++) {
            var data = disp[i];
            if(data.type != "brace") continue;
            var left  = base.left + data.start;
            var right = base.left + data.end;
            //var brace = makeCurlyBrace(rect.left, rect.bottom+30, rect.right, rect.bottom+30, 20, 0.6);
            var h = 10 + Math.min(Math.max((right-left), 0), 300)/300*20;

            var levelOffset = 10 + data.level*25;
            var level;
            var brace;
            if(data.up) {
              level = base.bottom + levelOffset;
              brace = makeCurlyBrace(left, level, right, level, h, 0.55);
            } else {
              level = base.top - levelOffset;
              brace = makeCurlyBrace(right, level, left, level, h, 0.55);
            }
            var path = svg.append("path").attr("class","curlyBrace");
            path.attr("stroke", data.color);
            path.attr("stroke-width", 5);
            path.attr("d",brace);

            var textx = left + 0.5*(right-left);
            var texty = level;

            var text = svg.append("text").attr("class","braceText");
            text.attr("x", textx);
            if(data.up) {
              text.attr("dy", "1.0em");
              texty += h;
            } else {
              text.attr("dy", "-1.0em");
              texty -= h;
            }
            text.attr("y", texty);
            text.attr("text-anchor", "middle");
            text.attr("fill", data.color);
            text.text(data.name);
            text.on("click", (function(d) {
              return (function() { moveToChar(d.startChar); openMenu(); });
            })(data));
      }
    }

    function parse_it(value) {
         var split = splitLine(value);
          //console.log("parsing");
         last_result = parse_fun(startCat, value);
         last_parser = startCat;
         Module.print("Parse result: " + JSON.stringify(last_result));

         if(last_result.type == "ErrParse") { // Got parsing error for startcat, try chunked parse
           console.log("TRying the chunked parser");
           last_result = parse_fun(chunksCat, value);
           last_parser = chunksCat;
           Module.print("CHUCNKED: Parse result: " + JSON.stringify(last_result));
         }

         clear_vis();
         var disp = get_brackets_display(value,last_result.brackets);
         update_brackets(disp, value, last_result.brackets);
         update_underlines(disp, value, last_result.brackets);

         Module.print("---");
         Module.print("line '" + split.line + "'");
         Module.print('prefix "'+ split.prefix +'"');

          var compl = Module.x_cnl_complete("Statement",split.line,split.prefix);
      compl_words = [];
          if(compl.type == "Ok") {
          for(i = 0; i < compl.completions.size(); i++) {
                         var c = compl.completions.get(i);
                         Module.print(c.word);
                         compl_words.push(c.word); 
                        }
    }
    }


    function update(value) {
      if(parse_fun != null) {
        parse_it(value);
      }
    }

