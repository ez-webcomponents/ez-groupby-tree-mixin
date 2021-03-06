/**
@license
Copyright (c) 2018 Martin Israelsen
This program is available under MIT license, available at 
  https://github.com/ez-webcomponents/ez-groupby-tree-mixin
*/

/**
 * @file ez-groupby-tree-mixin.js
 * @author Martin Isaelsen <martin.israelsen@gmail.com>
 * @description
 * A mixin to add javascript 'groupby' cababilities to a data set using recursive tree processing.  
 * Note:  Mainly useful for getting data in a format to be visualized in drilldown graphs.
 */
/* @polymerMixin */
export const EzGroupbyTreeMixin = (superclass) => class extends superclass {  

    //globalColors = ["#7cb5ec", "#434348", "#90ed7d", "#f7a35c", "#8085e9", "#f15c80", "#e4d354", "#2b908f", "#f45b5b", "#91e8e1"];
  
    /**
     * @function groupBy()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *    Groups up the 'data' into a tree object based on the 'groups' parameter. 
     *           
     * @param data        An array of objects that is to be grouped up  
     * @param groups      An array of objects that represents the order in which the data is to be grouped up.
     * @param fullGropuBy Same as 'groups' except that it contained the full groupby array each time through the recursion.
     * @param func        The function to use on each grouping.  Default is aggFunction()
     * @param pathFunc    The path function to use on each grouping.  Default is pathAgFunction()
     * 
     *    Given a 'data' set with the follows fields:
     *   [{
     *       "_id": "1",
     *       "revenue": "112",
     *       "division": "Development",
     *       "company": "Nucore",
     *       "startdate": "2018-01-01",
     *       "age": "10",
     *       "eyeColor": "green",
     *       "name": "Jack Spratt",
     *       "gender": "Male"
     *     },{
     *      ...
     *     }]
     * 
     *    Example of 'groups' Object:
     *           var groups = [
     *             {"field": "company", 
     *                 "datasets": [
     *                           {"label": "Sum of Ages", "backgroundcolor": "rgba(255, 99, 132, 0.2)", "bordercolor": "rgba(255, 99, 132, 0.9)", "data": "sum(age)", "type": "line"},
     *                           {"label": "Sum Revenue", "backgroundcolor": "rgba(54, 162, 235, 0.2)", "bordercolor": "rgba(54, 162, 235, 0.9)", "data": "sum(revenue)", "type": "bar"}
     *                         ],
     *             {"field": "date_trunc(month,startdate)", 
     *                 "datasets": [
     *                           {"label": "Sum Ages", "backgroundcolor": "rgba(255, 99, 132, 0.2)",  "bordercolor": "rgba(255, 99, 132, 0.2)", "data": "sum(age)", "type": "line"},
     *                           {"label": "Revenue", "backgroundcolor": "rgba(54, 162, 235, 0.2)",  "bordercolor": "rgba(54, 162, 235, 0.2)", "data": "sum(revenue)", "type": "bar"}
     *                         ],
     *             {"field": "division", 
     *                 "datasets": [
     *                           {"label": "Revenue", "backgroundcolor": "#8e95cd", "bordercolor": "#8e95cd", "data": "sum(revenue)", "type": "stackedbar"},
     *                           {"label": "Sum Ages", "backgroundcolor": "rgba(54, 162, 235, 0.2)", "bordercolor": "rgba(54, 162, 235, 0.9)", "data": "sum(age)", "type": "stackedbar"}
     *                         ]},
     *             {"field": "age", 
     *                 "datasets": [
     *                           {"label": "Revenue", "backgroundcolor": "#8e95cd", "bordercolor": "#8e95cd", "data": "sum(revenue)", "type": "bar"}
     *                         ]},
     *             {"field": "gender", 
     *                 "datasets": [
     *                           {"label": "Revenue", "backgroundcolor": "#8e95cd", "bordercolor": "#8e95cd", "data": "sum(revenue)", "type": "line"}
     *                         ]}
     *             ];
     * 
     * 
     * @return returns a Tree Object which has the data grouped up in each node of the tree
     *    The first level of the tree represents the first groupby field specififed in the 'groups' object.
     *    The second level of the tree represents the first & second groupby fields specified in the 'groups' object.
     *    the third level ... etc, etc...
     */
    groupBy(data, groups, fullGroupBy, aggFunc = this.aggFunction, pathAggFunc = this.pathAggFunction) {
  
      if (groups.length == 0) {
          //base case -- this returns the leaf nodes
          return Object.assign({},data);
      }
      else {
          let group = groups[0];
          let r = [];
          let names = [];

          for (var i=0; i < group.datasets.length; i++) {
            group.datasets[i]['aggField'] = this.parseAggStr(group.datasets[i].data);
          }
          group = this.parseGroupByField(group,group.field);
    
          // Loop through the data set to get the 'unique' group values for this level of the drilldown
          for (let i = 0; i < data.length; i++) {
              if(! this.IN(names, this.applyModifier(data[i][group.field], group))) {
                  names.push(this.applyModifier(data[i][group.field], group));
              }
          }
          // Sort the names so that time series will come out in ASC order
          names.sort(); 
    
          // Now loop through (this reduced set of) the unique grouped up values
          for (let index = 0; index < names.length; index++) {
              let name = names[index];
              let pathArray = [];
              let f = [];
              for (let  i = 0; i < data.length; i++) {
                  // Push the data onto the f[] that match this particular grouping.
                  // Note:  f[] will become the new data[] when we recurse.
                  if (this.applyModifier(data[i][group.field],group) == name) {
                      pathArray.push(i);
                      f.push(data[i]);
                  }
              }
  
              var path = name;
              r.push({
                  name : name,
                  chart : group.chart,
                  y : aggFunc(this, f, group, name),
                  drilldown : this.groupBy(f, groups.slice(1, groups.length), fullGroupBy, aggFunc, pathAggFunc),
                  group : group,
                  path  : pathAggFunc(this, f, fullGroupBy, group, name),
                  data  : f,
                  groups: fullGroupBy,
                  downloadObj: this.downloadFields
              });
          }
          return r;
      }
    }
  
    /**
     * @function IN()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *    Quickly check to see if the val is in the list.  
     *    Note:  The list starts empty and we push onto it when we find a unique value.
     *           
     * @param list        The array to check   
     * @param val         The value to check if it exists in the array already
     * 
     * @return true or false
     */
    IN(list, val) {
      if (list.indexOf(val) == -1) {
          return false;
      }
      return true;
    }
  
  
    /**
     * @function applyModifier()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *    Check to see if a modifier exists for this field.   If it doesn't quickly return.
     *    If it does exists then apply the modifier to the field and return the modified value.
     *    This is mostly useful for datetime fields.
     *           
     * @param list        The array to check   
     * @param val         The value to check if it exists in the array already
     * 
     * @return The modified value.
     */
    applyModifier(val, group) {
      if (typeof group.modifier == 'undefined') {
          return val;
      } else {
          switch(true){
              case /^date_trunc/.test(group.modifier):
                  var truncType = group.modifierParams[0];
                  switch(true) {
                      case /^day/.test(truncType):
                          try { val = new Date(val).toISOString().slice(0, 10); } catch (e) {  }
                          break;
                      case /^month/.test(truncType):
                          try { val = new Date(val).toISOString().slice(0, 7); } catch (e) { }
                          break;
                      case /^year/.test(truncType):
                          try { val = new Date(val).toISOString().slice(0, 4); } catch (e) { }
                          break;
                      default:
                  }
                  break;
              default: 
          }
          return val;  
      }
    }
    
    /**
     * @function parseAggStr()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *    Parses the datasets.data string to pull out the field that needs to be aggregated on.
     *    Example:  sum(revenue)  will return the string "revenue"
     *           
     * @param str        The aggregate field in the form of agg(field) 
     * 
     * @return The field to be aggregated on
     */
    parseAggStr(str) {
        let match = str.match(/\((.*)\)/);
        return match[1];
    }
    
  
    /**
     * @function parseGroupByField()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *    Parses the group by field to see if there are any modifiers.  If a modifier is found
     *    then the group.modifier field and modifierParams are filled in. 
     *    Example:  date_trunc(month,startdate)  will return the string "startdate"
     *           
     * @param group        The group object for this level of the tree.
     * @param str          The group by 'field' we want to check for modifiers
     * 
     * @return   Returns the modifield group object
     */
    parseGroupByField(group, str) {
        switch(true){
            case /^date_trunc/.test(str):
                let match = str.match(/\((.*)\)/); 
                if (typeof match != 'undefined' && match != null) {
                    group.modifier = "date_trunc";
                    group.modifierParams = match[1].split(/,/);
                    group.field = group.modifierParams[1];
                }
                break;
            default: 
        }  
        return group;
    }
    
    /**
     * @function aggFunction()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *    This function is called for each node of the grouping tree.  The group.datasets[j].data represents this grouping
     *    based on the aggregate defined (i.e. sum, max, min etc) and based on the field being agregated on (i.e. sum(revenue)).    
     *           
     * @param me           A reference to 'this' object
     * @param data         The data object for this grouping (an array of objects)
     * @param group        The current group object for this level in the tree
     * @param name         The actual field value that we are grouping on for this node of the tree.
     * 
     * @return   Returns the modifield group object
     */
    aggFunction(me, data, group, name) {
        var returnArray = [];
    
        // loop over each dataset in this grouping to aggregate each one.
        for (var j=0; j<group.datasets.length; j++) {
            if (typeof group.datasets[j] != 'undefined') {
                var str = group.datasets[j].data;
                switch(true){
                    case /^sum/.test(str): 
                        var aggField = group.datasets[j]['aggField'];
                        var returnNum = 0;
                        for (var i=0; i<data.length; i++) {
                            if (me.applyModifier(data[i][group.field],group) == name) {
                                returnNum = parseInt(data[i][aggField]) + returnNum;
                            }
                        }
                        returnArray.push(returnNum);
                        break;
                    case /^max/.test(str) : 
                        var aggField = group.datasets[j]['aggField'];
                        var returnNum = Number.MIN_SAFE_INTEGER;
                        for (var i=0; i<data.length; i++) {
                            if (me.applyModifier(data[i][group.field],group) == name && returnNum < parseInt(data[i][aggField])) {
                                returnNum = parseInt(data[i][aggField]);
                            }
                        }
                        returnArray.push(returnNum);
                        break;
                    case /^min/.test(str) : 
                        var aggField = group.datasets[j]['aggField'];
                        var returnNum = Number.MAX_SAFE_INTEGER ;
                        for (var i=0; i<data.length; i++) {
                            if (me.applyModifier(data[i][group.field],group) == name && returnNum > parseInt(data[i][aggField])) {
                                returnNum = parseInt(data[i][aggField]);
                            }
                        }
                        returnArray.push(returnNum);
                        break;
                    case /^count/.test(str) : 
                        var returnNum = 0;
                        for (var i=0; i<data.length; i++) {
                            if (me.applyModifier(data[i][group.field],group) == name) {
                                returnNum++;
                            }
                        }
                        returnArray.push(returnNum);
                        break;
                    case /^boxplot/.test(str) : 
                        var aggField = group.datasets[j]['aggField'];
                        var boxplot = {max: Number.MIN_SAFE_INTEGER, min:Number.MAX_SAFE_INTEGER, median: 0, q1:0, q3:0};
                        var sum1 = 0;
                        var arrayOfValues = [];
                        for (var i=0; i<data.length; i++) {
                            if (me.applyModifier(data[i][group.field],group) == name && boxplot.min > parseInt(data[i][aggField])) {
                                boxplot.min = parseInt(data[i][aggField]);
                            }
                            if (me.applyModifier(data[i][group.field],group) == name && boxplot.max < parseInt(data[i][aggField])) {
                                boxplot.max = parseInt(data[i][aggField]);
                            }
                            if (me.applyModifier(data[i][group.field],group) == name) {
                                arrayOfValues.push(parseInt(data[i][aggField]));
                            }
                        }
                        boxplot.q1 = me.Quartile_25(arrayOfValues);
                        boxplot.median = me.Quartile_50(arrayOfValues);
                        boxplot.q3 = me.Quartile_75(arrayOfValues);
                        returnArray.push(boxplot);
                        break;
                    default: 
                        console.log("Unknown datasets.data Function "+str)
                }
            }  
        }   
        return returnArray; 
    }
  
    Median(data) {
      return this.Quartile_50(data);
    }
    
    Quartile_25(data) {
      return this.Quartile(data, 0.25);
    }
    
    Quartile_50(data) {
      return this.Quartile(data, 0.5);
    }
    
    Quartile_75(data) {
      return this.Quartile(data, 0.75);
    }
    
    Quartile(data, q) {
      data=this.Array_Sort_Numbers(data);
      var pos = ((data.length) - 1) * q;
      var base = Math.floor(pos);
      var rest = pos - base;
      if( (data[base+1]!==undefined) ) {
        return data[base] + rest * (data[base+1] - data[base]);
      } else {
        return data[base];
      }
    }
    
    Array_Sort_Numbers(inputarray){
      return inputarray.sort(function(a, b) {
        return a - b;
      });
    }
    
    Array_Sum(t){
       return t.reduce(function(a, b) { return a + b; }, 0); 
    }
    
    Array_Average(data) {
      return this.Array_Sum(data) / data.length;
    }
    
    Array_Stdev(tab){
       var i,j,total = 0, mean = 0, diffSqredArr = [];
       for(i=0;i<tab.length;i+=1){
           total+=tab[i];
       }
       mean = total/tab.length;
       for(j=0;j<tab.length;j+=1){
           diffSqredArr.push(Math.pow((tab[j]-mean),2));
       }
       return (Math.sqrt(diffSqredArr.reduce(function(firstEl, nextEl){
                return firstEl + nextEl;
              })/tab.length));  
    }
    
    /**
     * @function pathAggFunction()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *   This function calculates the path for this node in the tree using the current groups object 
     *   and the first record in the current data object.
     * 
     * @param me           A reference to 'this' object
     * @param data         The data object for this grouping (an array of objects)
     * @param group        The current group object for this level in the tree
     * @param name         The actual field value that we are grouping on for this node of the tree.
     * 
     * @return   Returns a string in the form:    "path > path > path..."
     */
    pathAggFunction(me, data, groups, group, name) {
        var path = "";
        for (var i=0; i<groups.length; i++) {
            if (groups[i].field != group.field) {
                path += me.applyModifier(data[0][groups[i].field],groups[i]) + " > ";
            } else {
                path += me.applyModifier(data[0][groups[i].field],groups[i]);
                break;
            }
    
        }
        return path;
    }
  
    /**
     * @function downloadData()
     * @author Martin Israelsen <martin.israelsen@gmail.com>
     *    Dumps out the data for this particular 'data' object into csv format.
     *           
     * @param series       The series object which holds the path information for this data object
     * @param downloadObj  Holds which fields to download.
     * @param data         The data object to download.
     * 
     * @return a csv file of the data
     */        
    downloadDataToCsv(series, downloadObj, data) {
      var me = this;
      var exportStr = "";
  
      exportStr += me.title;
      exportStr += "\n\n";
  
      if (typeof series.path != 'undefined') {
          exportStr += "Local Filter:\n";
          series.path = series.path.replace(/,/g, " ");
          if (parseInt(series.path) > 0) {
              exportStr += '="'+series.path+'"'+",";
          } else {
              exportStr += '"'+series.path+'"'+",";
          }
          exportStr += "\n\n\n";
      }
  
      // Dump out header
      for (var item in downloadObj) {
          exportStr += '"'+downloadObj[item]+'"'+",";
      }
      exportStr += "\n";
  
      // Now dump out data.
      for (var k= 0; k < data.length; k++) {
          for (var i=0; i< downloadObj.length; i++) {
               exportStr += '"'+data[k][downloadObj[i]]+'"'+",";           
          }
  
          exportStr += "\n";
      }
  
      me.export(exportStr, "ez_download.csv", 'text/csv;charset=utf-8;');
    }
  
  /**
     * @function export()
     *    Downloads the formatted string to the client computer in csv format.
     *           
     * @param exportStr       The data string to download 
     * @param filename        The name of the file to download to client computer
     * @param fileType        The format of the file -- in this case text/csv
     * 
     * @return a csv file of the data
     */         
      export(exportStr, filename, fileType) {
          var blob = new Blob([exportStr], { type: fileType });
          if (navigator.msSaveBlob) { // IE 10+
              navigator.msSaveBlob(blob, filename);
          } else {
              var link = document.createElement("a");
              if (link.download !== undefined) { // feature detection
                  // Browsers that support HTML5 download attribute
                  var url = URL.createObjectURL(blob);
                  link.setAttribute("href", url);
                  link.setAttribute("download", filename);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
              }
          }
      }
  
  };