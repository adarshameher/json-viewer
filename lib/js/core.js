'use strict';

var jsonViewerApp = angular.module("jsonViewerApp", []);

// directive
jsonViewerApp.directive('tooltip', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            element.hover(function(){
                // on mouseenter
                element.tooltip('show');
            }, function(){
                // on mouseleave
                element.tooltip('hide');
            });
        }
    };
});

// OnUploadJsonChange directive start
jsonViewerApp.directive('onUploadJsonChange', function () {
    return {
      restrict: 'A',
      scope:{
          onUploadJsonChange:"&"
      },
      link: function($scope, element, attrs) {
          console.log("element", element);
        element.on('change', function(onChangeEvent) {
          var reader = new FileReader();
          var file = (onChangeEvent.srcElement || onChangeEvent.target).files[0];
          console.log("file", file);
          var err = undefined;
          reader.onload = function(onLoadEvent) {
              $scope.$apply(function() {
                $scope.onUploadJsonChange({$fileContent:onLoadEvent.target.result, $file:file, $err:err});
              });
          };
          if(file){
              if(file.name && (file.name.endsWith(".json"))) {
                  reader.readAsText(file);
              } else {
                  err = "InvalidJsonFileFormat";
                  reader.readAsText(new Blob([""], {type: 'text/plain'}));
              }
          }
        });
      }
    };
  });
  // OnUploadJsonChange directive end

jsonViewerApp.controller("viewController", ["$scope", "$timeout", 
    function($scope, $timeout) {
        $scope.originalJsonData = undefined;
        $scope.validJsonData = false;
        $scope.jsonData = {};
        $scope.isParsing = false;
        $scope.errMsg = undefined;
        $scope.isShowTree = true;
        $scope.isShowStructure = false;
        $scope.defaultExpandUpToLevel = 5;
        $scope.maxExpandUpToLevel = 0;

        $scope.viewJson = function(fileContent, lvl) {
            $scope.resetParams();
            $scope.isParsing = true;
            $timeout(() => {
                try {
                    if(!fileContent && !$scope.originalJsonData) {
                        throw new Error("No Json Data provided");
                    }
                    if($scope.originalJsonData) {
                        $scope.clearJsonFile();
                    }
                    let json = fileContent || $scope.originalJsonData;
                    $scope.jsonData = JSON.parse(json);
                    $scope.maxExpandUpToLevel = $scope.getMaxLevel();
                    $scope.defaultExpandUpToLevel = lvl ? lvl : 
                        $scope.defaultExpandUpToLevel >= $scope.maxExpandUpToLevel ? 
                            $scope.maxExpandUpToLevel : $scope.defaultExpandUpToLevel;
                    $scope.validJsonData = true;
                    $scope.isParsing = false;
                    //console.log("$scope.defaultExpandUpToLevel", $scope.defaultExpandUpToLevel);
                    //console.log("$scope.maxExpandUpToLevel", $scope.maxExpandUpToLevel);
                } catch (err) {
                    console.error("JSON Parse Error:", err);
                    $scope.validJsonData = false;
                    $scope.errMsg = err;
                    $scope.isParsing = false;
                }
            }, 1000);
        }

        $scope.processUploadedJSONFile = function(fileContent, file, err) {
            if(err){
        		$timeout(function() {
        			console.error("JSON Parse Error:", err);
                    $scope.validJsonData = false;
                    $scope.errMsg = err;
                    $scope.isParsing = false;
        		}, 10);
        		return;
            }
            $scope.originalJsonData = undefined;
            $scope.viewJson(fileContent, undefined);
        }

        $scope.resetParams = function() {
            $scope.validJsonData = false;
            $scope.jsonData = {};
            $scope.errMsg = undefined;
            $scope.isParsing = false;
            $scope.isShowTree = true;
            $scope.isShowStructure = false;
            $scope.defaultExpandUpToLevel = 5;
            $scope.maxExpandUpToLevel = 0;
        }

        $scope.getFormattedJsonData = function() {
            return JSON.stringify($scope.jsonData, null, 4);
        }

        $scope.getKeys = function(data) {
            //console.log("data", data);
            return Object.keys(data);
        }

        $scope.getMaxLevel = function() {
            let maxLevel = $scope.calculateMaxLevelRecursive($scope.jsonData, 0);
            //console.log("maxLevel", maxLevel);
            return maxLevel;
        }

        $scope.calculateMaxLevelRecursive = function(item, level) {
            //console.log("item", item, "lvl", level);
            let currentLevel = 0;
            if($scope.getKeys(item).length > 0) {
                level++;
                $scope.getKeys(item).forEach(key => {
                    let val = item[key];
                    //console.log("currLevel before", currentLevel);
                    if($scope.isArrayType(val) || $scope.isObjectType(val)) {
                        let lvl = $scope.calculateMaxLevelRecursive(val, level);
                        currentLevel = currentLevel >= lvl ? currentLevel : lvl;
                        //console.log("currLevel after", currentLevel);
                    } else {
                        currentLevel = currentLevel >= level ? currentLevel : level;
                    }
                });
            } else {
                return level;
            }
            return currentLevel;
        }

        $scope.isSimpleType = function(item) {
            //console.log("simpleType", typeof(item) != "object" && !Array.isArray(item));
            return (typeof(item) != "object" && !Array.isArray(item)) || item === null;
        }

        $scope.isArrayType = function(item) {
            //console.log("arrayType", Array.isArray(item));
            return Array.isArray(item);
        }

        $scope.isObjectType = function(item) {
            //console.log("objectType", typeof(item) == "object" && !Array.isArray(item));
            return typeof(item) == "object" && !Array.isArray(item) && item !== null;
        }

        $scope.getType = function(item) {
            return $scope.isSimpleType(item) ? item === null ? "null" : typeof(item) : 
                $scope.isArrayType(item) ? "Array" : "Object";
        }

        $scope.showTree = function() {
            $scope.isShowTree = true;
            $scope.isShowStructure = false;
        }

        $scope.showStructure = function() {
            $scope.isShowTree = false;
            $scope.isShowStructure = true;
        }

        $scope.copyStructuredJson = function() {
            // get the content to copy
            const copyText = document.getElementById("json-structure-data").textContent;
            // create temp element
            let copyElement = document.createElement("textarea");
            copyElement.id = "tempCopyElement";
            copyElement.textContent = copyText;
            document.body.append(copyElement);
        
            // select the text
            copyElement.select();
            // let range = document.createRange();
            // range.selectNode(copyElement);
            // window.getSelection().removeAllRanges();
            // window.getSelection().addRange(range);
        
            // copy & cleanup
            document.execCommand('copy');
            window.getSelection().removeAllRanges();
            copyElement.remove();
        }

        $scope.range = function(min, max, step) {
            step = step || 1;
            var input = [];
            for (var i = min; i <= max; i += step) {
                input.push(i);
            }
            return input;
        }

        $scope.changeExpandLevel = function(lvl) {
            //console.log("update lvl", lvl);
            $scope.defaultExpandUpToLevel = lvl;
            //console.log("updated expandLevel", $scope.defaultExpandUpToLevel);
            $scope.viewJson(undefined, $scope.defaultExpandUpToLevel);
        }

        $scope.clearJsonFile = function() {
            $scope.removeSelectedJsonFile();
            $scope.resetParams();
        }

        $scope.removeSelectedJsonFile = function() {
            angular.element("#ulJsonFile").val(null);
        }
    }
]);