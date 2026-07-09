"use strict";

function tablesCtrl(sharedService, anchorsService, $scope, $timeout, $element) {
    var tab = this;
    tab.tablesClient = [];
    tab.MinhalSchoolClient = [];
    tab.Table = [];
    tab.Filters = [];
    tab.colIndexes = {};
    tab.hasHiddensCol = false;
    tab.listType = null;
    tab.listUrl = null;
    tab.SiteUrl = null;
    tab.groups = [];
    tab.nestedGroups = [];
    tab.isGroup = false;
    tab.isNestedGroup = false;
    tab.isSearchKeyMobile = false;
    tab.allOptions = 'כל האפשרויות';
    tab.searchKey = '';
    tab.IsSchoolPage = false;

    tab.tempResponseItems = [];
    tab.tempMinhalResponseItems = [];
    tab.allItemsCollected = false;
    $scope.close = [];
    //#region Init
    tab.init = function (obj, IsSchoolPage, MinhalSchoolClient) {
        obj.title = replaceAll(obj.title, 'tlvGeresh2', '"');
        tab.IsSchoolPage = IsSchoolPage != undefined && IsSchoolPage.trim() == 'True' ? true : false;
        tab.tablesClient = obj;
        tab.MinhalSchoolClient = MinhalSchoolClient;
        tab.allOptions = tableResources.AllOptions;
        //if (tlvGeneral != null) {
        //    if (tlvGeneral.lang == 'English')
        //        tab.allOptions = 'All Options';
        //}

        tab.getContent();
        if (tab.tablesClient.isTitleOgen) {
            $timeout(function () {
                anchorsService.broadcastAnchor('.TlvTables .title h2.ogen');
            });
        }
    };

    tab.getContent = function () {




        if (tab.IsSchoolPage) {
            var sclID = QueryString['schoolID'];
            if (sclID != undefined && sclID != "") {
                sharedService.GetGenericRequest({
                    method: "POST",
                    url: '/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables',
                    data: tab.MinhalSchoolClient,
                    async: false
                })
                    .then(function (response) {

                        angular.forEach(response.items, function (value, key) {
                            if (buildItem(value).Exclusion != undefined && buildItem(value).Exclusion.Value.indexOf(sclID) < 0) {
                                var fieldsTemp = [];
                                angular.forEach(value.Fields, function (Fieldsvalue, Fieldskey) {
                                    if (Fieldsvalue.InternalName != "Exclusion" && Fieldsvalue.InternalName != "SemelMosad" && (!isMobile() || (isMobile() && !tab.tablesClient.isDigitel) ||
                                        (isMobile() && (Fieldsvalue.InternalName == "LinkTitle" || Fieldsvalue.InternalName == "Title" || Fieldsvalue.InternalName == "ID" || Fieldsvalue.InternalName == "Yom" || Fieldsvalue.InternalName == "Category"))))
                                        fieldsTemp.push(Fieldsvalue);

                                });

                                value.Fields = fieldsTemp;
                                value.webId = tab.MinhalSchoolClient.dataSource.WebId;
                                value.listId = tab.MinhalSchoolClient.dataSource.ListId;
                                tab.tempMinhalResponseItems.push(value);

                            }
                        });
                        if (tab.allItemsCollected) {
                            response.items = tab.tempMinhalResponseItems.concat(tab.tempResponseItems);
                            tab.FillSchoolTables(response);
                        }
                        tab.allItemsCollected = true;

                    }, function (error) {
                        console.log('tablesCtrl MinhalSchoolClient ' + error);
                    });

                sharedService.GetGenericRequest({
                    method: "POST",
                    url: '/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables',
                    data: tab.tablesClient,
                    async: false
                })
                    .then(function (response) {


                        angular.forEach(response.items, function (value, key) {
                            if (buildItem(value).SemelMosad != undefined && buildItem(value).SemelMosad.Value == sclID) {
                                var fieldsTemp = [];
                                angular.forEach(value.Fields, function (Fieldsvalue, Fieldskey) {
                                    if (Fieldsvalue.InternalName != "Exclusion" && Fieldsvalue.InternalName != "SemelMosad" && (!isMobile() || (isMobile() && !tab.tablesClient.isDigitel) ||
                                        (isMobile() && (Fieldsvalue.InternalName == "LinkTitle" || Fieldsvalue.InternalName == "Title" || Fieldsvalue.InternalName == "Yom" || Fieldsvalue.InternalName == "Category"))))
                                        fieldsTemp.push(Fieldsvalue);
                                });
                                value.Fields = fieldsTemp;
                                value.webId = tab.tablesClient.dataSource.WebId;
                                value.listId = tab.tablesClient.dataSource.ListId;
                                tab.tempResponseItems.push(value);
                            }
                        });

                        if (tab.allItemsCollected) {
                            response.items = tab.tempMinhalResponseItems.concat(tab.tempResponseItems);
                            tab.FillSchoolTables(response);
                        }
                        tab.allItemsCollected = true;




                    }, function (error) {
                        console.log('tablesCtrl ' + error);
                    });

            }


        } else {

            sharedService.GetGenericRequest({
                method: "POST",
                url: '/_vti_bin/TlvSP2013PublicSite/TlvList.svc/GetTables',
                data: tab.tablesClient
            })
                .then(function (response) {

                    dataClientJson.push(response);

                    if (response.items == null)
                        return;

                    tab.getTable(response);
                    tab.getFilters();
                    tab.getColumnsIndex();

                    if (!tab.isNestedGroup) {
                        for (var i = 0; i < tab.groups.length; i++) {
                            tab.doPaging(tab.groups[i]);
                        }
                    }
                    else {
                        for (var i = 0; i < tab.groups.length; i++) {
                            {
                                for (var j = 0; j < tab.groups[i].subGroups.length; j++) {
                                    tab.doPaging(tab.groups[i].subGroups[j]);
                                }
                            }
                        }
                    }

                    dataClientJson.push(tab.groups[0].paging);
                }, function (error) {
                    console.log('tablesCtrl ' + error);
                });
        }
    };

    tab.FillSchoolTables = function (response) {
        dataClientJson.push(response);

        if (response.items == null)
            return;

        tab.getTable(response);
        tab.getFilters();
        tab.getColumnsIndex();

        if (!tab.isNestedGroup) {
            for (var i = 0; i < tab.groups.length; i++) {
                tab.doPaging(tab.groups[i]);
            }
        }
        else {
            for (var i = 0; i < tab.groups.length; i++) {
                {
                    for (var j = 0; j < tab.groups[i].subGroups.length; j++) {
                        tab.doPaging(tab.groups[i].subGroups[j]);
                    }
                }
            }
        }

        dataClientJson.push(tab.groups[0].paging);
    }

    tab.getTable = function (response) {
        tab.listType = response.listType;
        tab.listUrl = response.listUrl;

        for (var i = 0; i < response.items.length; i++) {
            response.items[i].display = true;
        }

        tab.Table = response.items;

        for (var i = 0; i < tab.Table.length; i++) {
            for (var j = 0; j < tab.Table[i].Fields.length; j++) {
                if (tab.Table[i].Fields[j].Value !== '') {
                    if (tab.Table[i].Fields[j].Type == 'Boolean') {
                        var val = tab.Table[i].Fields[j].Value;
                        if (val == 'False')
                            tab.Table[i].Fields[j].Value = 'לא';
                        else if (val == 'True')
                            tab.Table[i].Fields[j].Value = 'כן';
                    }

                    else if (tab.Table[i].Fields[j].Type == 'TlvUploadImage') {
                        var rend = 0;
                        var ind = tab.Table[i].Fields[j].Value.indexOf("sq-img-");

                        if (ind != -1)
                            tab.Table[i].Fields[j].Value = tab.Table[i].Fields[j].Value.substring(0, ind) + "tblImgSize " + tab.Table[i].Fields[j].Value.substring(ind);

                        var indStart = tab.Table[i].Fields[j].Value.indexOf("src=") + 5;
                        var indEnd = tab.Table[i].Fields[j].Value.indexOf("\"", indStart + 1);

                        if (indEnd > indStart) {
                            var imgSrc = tab.Table[i].Fields[j].Value.substring(indStart, indEnd);
                            var rendAdd = "";

                            rend = $(window).width() < 576 ? 2 : 1;

                            if (imgSrc.indexOf('?') == -1)
                                rendAdd = "?";
                            else
                                rendAdd = "&";

                            rendAdd += "RenditionID=" + rend;

                            tab.Table[i].Fields[j].Value = tab.Table[i].Fields[j].Value.substring(0, indEnd) + rendAdd + tab.Table[i].Fields[j].Value.substring(indEnd);
                        }
                    }

                    else if (tab.Table[i].Fields[j].Type == 'Note') {
                        tab.Table[i].Fields[j].Value = replaceAll(tab.Table[i].Fields[j].Value, '\n', '<br>');
                    }

                    else if (tab.Table[i].Fields[j].Type == 'Text') {
                        var note = tab.Table[i].Fields[j].Value;

                        var x = 0;
                        var mailto = "";
                        var toReplace = [];

                        while (x < note.length) {
                            if (note[x] == "@") {
                                var xB = x - 1;
                                while (note[xB] != " " && note[xB] != "," && note[xB] != ";" && note[xB] != ":" && note[xB] != "?" && note[xB] != "!" && note[xB] != "\"" && xB > 0) {
                                    xB--;
                                }
                                var xF = x + 1;
                                while (note[xF] != " " && note[xF] != "," && note[xF] != ";" && note[xF] != ":" && note[xF] != "?" && note[xF] != "!" && note[xF] != "\"" && xF < note.length) {
                                    xF++;
                                }

                                if (xB > 0)
                                    xB++;

                                mailto = "<a href='mailto:" + note.substring(xB, xF) + "'>" + note.substring(xB, xF) + "</a>";
                                note = note.substring(0, xB) + mailto + note.substring(xF);
                                x = xB + mailto.length + 1;
                            }
                            else
                                x++;
                        }

                        tab.Table[i].Fields[j].Value = note;
                    }

                    else if (tab.Table[i].Fields[j].Type == 'DateTime') {
                        var date = tab.Table[i].Fields[j].Value.split(' ')[0];
                        tab.Table[i].Fields[j].Value = date;
                    }

                    else if (tab.Table[i].Fields[j].Type == 'URL') {
                        var url = tab.Table[i].Fields[j].Value.split(',')[0];
                        var caption = tab.Table[i].Fields[j].Value.split(',')[1];
                        var target = '_self';
                        if (url.startsWith('/')) {
                            target = '_self';
                        }
                        else if (!url.startsWith('http')) {
                            url = 'http://' + url;
                            target = '_blank';
                        }
                        var val = "<a class='collink' href='" + url + "' target='" + target + "'>" + caption + "</a>";
                        tab.Table[i].Fields[j].Value = val;
                    }

                    else if (tab.Table[i].Fields[j].Type == 'LongUrlField') {
                        var tlvLink = getTlvLink(tab.Table[i].Fields[j].Value);
                        var val = "<a class='collink' href='" + tlvLink.Url + "' target='" + tlvLink.Target + "'>" + tlvLink.Caption + "</a>";
                        tab.Table[i].Fields[j].Value = val;
                    }

                    else if (tab.Table[i].Fields[j].Type == 'MultiChoice' || tab.Table[i].Fields[j].Type == 'InterestsTaggingField') {
                        var val = replaceAll(tab.Table[i].Fields[j].Value, ';#', ',');
                        var arr = val.split(',');
                        tab.Table[i].Fields[j].Value = arr.filter(Boolean).join(', ');
                    }

                    else if (tab.Table[i].Fields[j].Type == 'TlvCascadingLookupField') {
                        var val = tab.Table[i].Fields[j].Value.split(';#');
                        tab.Table[i].Fields[j].Value = val[1];
                    }

                    else if (tab.Table[i].Fields[j].Type == 'TlvFilteredLookupField') {
                        var val = tab.Table[i].Fields[j].Value.split(';#');
                        tab.Table[i].Fields[j].Value = val[1];
                    }

                    else if (tab.Table[i].Fields[j].Type == 'TaxonomyFieldType') {
                        if (tab.Table[i].Fields[j].Value !== '') {
                            var val = tab.Table[i].Fields[j].Value.split('|');
                            tab.Table[i].Fields[j].Value = val[0];
                        }
                    }

                    else if (tab.Table[i].Fields[j].Type == 'TaxonomyFieldTypeMulti') {
                        if (tab.Table[i].Fields[j].Value.indexOf(';') == -1) {
                            var val = tab.Table[i].Fields[j].Value.split('|');
                            tab.Table[i].Fields[j].Value = val[0];
                        }
                        else {
                            var multiVal = '';
                            var allVal = tab.Table[i].Fields[j].Value.split(';');
                            for (var i = 0; i < allVal.length; i++) {
                                if (multiVal != '')
                                    multiVal += '|'
                                var val = allVal[i].split('|');
                                multiVal += val[0];
                            }
                            tab.Table[i].Fields[j].Value = multiVal;
                        }
                    }

                    else if (tab.Table[i].Fields[j].Type == 'LookupMulti') {
                        if (tab.Table[i].Fields[j].Value.indexOf('|') == -1) {
                            var val = tab.Table[i].Fields[j].Value.split(';#');
                            tab.Table[i].Fields[j].Value = val[1];
                        }
                        else {
                            var multiVal = '';
                            var allVal = tab.Table[i].Fields[j].Value.split('|');
                            for (var k = 0; k < allVal.length; k++) {
                                if (multiVal != '')
                                    multiVal += ', '
                                var val = allVal[k].split(';#');
                                multiVal += val[1];
                            }
                            tab.Table[i].Fields[j].Value = multiVal;
                        }
                    }
                }

                if (tab.Table[i].Fields[j].InternalName == 'LinkFilename') {
                    tab.Table[i].Fields[j].Caption = tableResources.fileName;
                    var fVal = tab.Table[i].Fields[j].Value;
                    var fValStr = fVal.replace(/\.[^/.]+$/, "");
                    var val = "<a class='colfile' href='" + tab.listUrl + '/' + fVal + "' target='_blank'><span class='icon icon-documents'></span> <span class='val'>" + fValStr + "</span></a>";
                    tab.Table[i].Fields[j].Value = val;
                }

                else if (tab.Table[i].Fields[j].InternalName == 'LinkTitle' || tab.Table[i].Fields[j].InternalName == 'Title') {
                    if (response.fieldOotbTitle !== null && response.fieldOotbTitle !== '') {
                        tab.Table[i].Fields[j].Caption = response.fieldOotbTitle;
                    }
                }

                else if (tab.Table[i].Fields[j].InternalName == 'fontIcon') {
                    tab.Table[i].Fields[j].Caption = '';
                    tab.Table[i].Fields[j].Value = "<span class='icon " + tab.Table[i].Fields[j].Value + "'></span>";
                }

                else if (tab.Table[i].Fields[j].InternalName == 'InterestTaggingFirstIconFont') {
                    tab.Table[i].Fields[j].Caption = '';
                    tab.Table[i].Fields[j].Value = "<span class='icon " + tab.Table[i].Fields[j].Value + "'></span>";
                }

                if (tab.Table[i].Fields[j].InternalName == 'SemelMosad') {
                    tab.Table[i].Fields[j].display = false;
                    tab.Table[i].Fields[j].Value = '';
                }

                if (tab.Table[i].Fields[j].InternalName == 'Exclusion') {
                    tab.Table[i].Fields[j].display = false;
                    tab.Table[i].Fields[j].Value = '';
                }

                tab.fixFieldCaption(tab.Table[i].Fields[j]);

                if (tab.tablesClient.isDigitel) {
                    if (tab.Table[i].Fields[j].InternalName == 'ID') {
                        tab.Table[i].Fields[j].display = false;
                        tab.Table[i].ItemID = tab.Table[i].Fields[j].Value;
                        tab.Table[i].Fields[j].Value = '';
                    }
                    else {
                        tab.Table[i].Fields[j].display = true;
                    }
                }
            }

            if (tab.tablesClient.isDigitel) {
                tab.Table[i].Fields[0].Value = '<span class="first">' + tab.Table[i].Fields[0].Value + '</span>';
            }
        }

        if (response.groupingFields != null && response.groupingFields.length == 1) {
            tab.isGroup = true;
            var groupName = null;

            for (var i = 0; i < tab.Table.length; i++) {
                for (var j = 0; j < tab.Table[i].Fields.length; j++) {
                    if (tab.Table[i].Fields[j].InternalName == response.groupingFields[0]) {
                        if (groupName == null || tab.Table[i].Fields[j].Value != groupName) {
                            groupName = tab.Table[i].Fields[j].Value;
                            var group = {};
                            group.Name = groupName;
                            group.Table = [];
                            group.paging = [];
                            group.hasPaging = false;
                            tab.groups.push(group);
                        }
                    }
                }
                tab.Table[i].group = groupName;
                tab.groups[tab.groups.length - 1].Table.push(tab.Table[i]);
            }

            if (tab.isGroup)
                tab.getAllGroupTableLength();
        }
        else if (response.groupingFields != null && response.groupingFields.length == 2) {
            tab.isNestedGroup = true;
            tab.isGroup = true;

            for (var i = 0; i < tab.Table.length; i++) { //iterate over rows in list. 

                var groupIndex = -1;
                var subGroupIndex = -1;
                var groupName = "";
                var subGroupName = "";

                for (var j = 0; j < tab.Table[i].Fields.length; j++) { //for each row go over fields
                    if (tab.Table[i].Fields[j].InternalName == response.groupingFields[0]) { //main group
                        {
                            for (var x = 0; x < tab.groups.length; x++) {
                                if (tab.groups[x].Name == tab.Table[i].Fields[j].Value)
                                    groupIndex = x;
                            }

                            if (groupIndex == -1) {
                                var newGroup = [];
                                newGroup.Name = tab.Table[i].Fields[j].Value;
                                newGroup.subGroups = [];
                                tab.groups.push(newGroup);
                                groupIndex = tab.groups.length - 1;
                            }

                            groupName = tab.Table[i].Fields[j].Value;
                        }
                    }

                    if (tab.Table[i].Fields[j].InternalName == response.groupingFields[1]) { //subgroup
                        for (var x = 0; x < tab.groups[groupIndex].subGroups.length; x++) {
                            if (tab.groups[groupIndex].subGroups[x].Name == tab.Table[i].Fields[j].Value)
                                subGroupIndex = x;
                        }

                        if (subGroupIndex == -1) {
                            var newSubGroup = [];
                            newSubGroup.Name = tab.Table[i].Fields[j].Value;
                            newSubGroup.Table = [];
                            newSubGroup.paging = [];
                            newSubGroup.hasPaging = false;
                            tab.groups[groupIndex].subGroups.push(newSubGroup);
                            subGroupIndex = tab.groups[groupIndex].subGroups.length - 1;
                        }

                        tab.groups[groupIndex].subGroups[subGroupIndex].Table.push(tab.Table[i]);

                        subGroupName = tab.Table[i].Fields[j].Value;
                    }

                    tab.Table[i].group = groupName;
                    tab.Table[i].subGroup = subGroupName;
                }
            }

            tab.getAllGroupsAndSubGroupsTableLength();
        }
        else {
            var group = {};
            group.Table = tab.Table;
            group.paging = [];
            group.hasPaging = false;
            tab.groups.push(group);
        }

        if (tab.groups.length == 0 && tab.Table.length == 0) {
            $element.parents("[class^='wp-']").hide();
        }
    };

    tab.getRowTitle = function (row) {
        for (var v = 0; v < row.Fields.length; v++)
            if (row.Fields[v].InternalName == 'LinkTitle' || row.Fields[v].InternalName == 'Title')
                return row.Fields[v].Value.replace('<span class="first">', '').replace('</span>', '');
    }

    tab.fixFieldCaption = function (field) {
        if (field.Caption == 'כתובת1')
            field.Caption = tableResources.addressFieldCaption;

        else if (field.Caption == 'Start Date')
            field.Caption = tableResources.startDateFieldCaption;

        else if (field.Caption.indexOf("_QuarterName") != -1)
            field.Caption = tableResources.addressQtrNameFieldCaption;

        else if (field.Caption.indexOf("_QuarterID") != -1)
            field.Caption = tableResources.addressQtrCodeFieldCaption;

        else if (field.Caption.indexOf("_NeighborhoodName") != -1)
            field.Caption = tableResources.addressNbhdNameFieldCaption;

        else if (field.Caption.indexOf("_NeighborhoodCode") != -1)
            field.Caption = tableResources.addressNbhdCodeFieldCaption;

        else if (field.Caption.indexOf("_HouseNumber") != -1)
            field.Caption = tableResources.addressHouseNumFieldCaption;

        else if (field.Caption.indexOf("_MapUrl") != -1)
            field.Caption = tableResources.addressLnkToMapFieldCaption;

        else if (field.Caption.indexOf("_CommAreaName") != -1)
            field.Caption = tableResources.addressAreaNameFieldCaption;

        else if (field.Caption.indexOf("_CommAreaCode") != -1)
            field.Caption = tableResources.addressAreaCodeFieldCaption;

        else if (field.Caption.indexOf("_BranchName") != -1)
            field.Caption = tableResources.addressBranchNameFieldCaption;

        else if (field.Caption.indexOf("_BranchCode") != -1)
            field.Caption = tableResources.addressBranchCodeFieldCaption;

        else if (field.Caption.indexOf("_LAT") != -1)
            field.Caption = tableResources.addressLatFieldCaption;

        else if (field.Caption.indexOf("_LON") != -1)
            field.Caption = tableResources.addressLonFieldCaption;

        else if (field.Caption.indexOf("_StreetName") != -1)
            field.Caption = tableResources.addressStreetNameFieldCaption;

        else if (field.Caption.indexOf("_StreetCode") != -1)
            field.Caption = tableResources.addressStreetCodeFieldCaption;

    }

    tab.getFilters = function () {
        if (tab.Table.length > 0) {
            var fields = tab.Table[0].Fields;
            var filters = tab.tablesClient.filters;
            for (var i = 0; i < filters.length; i++) {
                for (var j = 0; j < fields.length; j++) {
                    if (fields[j].InternalName == filters[i]) {
                        var f = { Name: fields[j].Caption, Type: tab.Table[i].Fields[j].Type, isOpen: false, Selected: false, SelectedValue: tab.allOptions };
                        f.Values = tab.getFilterValues(f);
                        tab.Filters.push(f);
                        break;
                    }
                }
            }
        }
        tab.hasFilters = tab.Filters.length > 0;

        if (tab.hasFilters) {
            $(".tlvFiltersMainWrapper").attr("aria-hidden", false);
            $(".tlvFiltersLegend").attr("aria-hidden", false);
            $(".tlvFilterLegendEach").each(function () {
                $(this).attr("aria-hidden", false);
            });
        }
        else {
            $(".tlvFiltersMainWrapper").attr("aria-hidden", true);
            $(".tlvFiltersLegend").attr("aria-hidden", true);
            $(".tlvFilterLegendEach").each(function () {
                $(this).attr("aria-hidden", true);
            });
        }
    };

    tab.getFilterValues = function (field) {
        var values = [];
        for (var i = 0; i < tab.Table.length; i++) {
            for (var j = 0; j < tab.Table[i].Fields.length; j++) {
                if (tab.Table[i].Fields[j].Caption == field.Name) {
                    var fVal = tab.Table[i].Fields[j].Value;
                    if (fVal != '') {
                        if (tab.Table[i].Fields[j].Type == 'LookupMulti' || tab.Table[i].Fields[j].Type == 'MultiChoice') {
                            if (fVal.indexOf(',') == -1) {
                                if (values.map(function (e) { return e.Name; }).indexOf(fVal) == -1) {
                                    var val = { Name: tab.Table[i].Fields[j].Value, isCheck: false }
                                    values.push(val);
                                }
                            }
                            else {
                                var arr = fVal.split(',');
                                for (var k = 0; k < arr.length; k++) {
                                    if (values.map(function (e) { return e.Name; }).indexOf(arr[k].trim()) == -1) {
                                        var val = { Name: arr[k].trim(), isCheck: false }
                                        values.push(val);
                                    }
                                }
                            }
                        }
                        else if (tab.Table[i].Fields[j].Type == 'Boolean') {
                            var val = { Name: tab.getTranslateBoolean(tab.Table[i].Fields[j].Value), isCheck: false }
                            if (values.map(function (e) { return e.Name; }).indexOf(val.Name) == -1) {
                                values.push(val);
                            }
                        }
                        else if (values.map(function (e) { return e.Name; }).indexOf(fVal) == -1) {
                            var val = { Name: tab.Table[i].Fields[j].Value, isCheck: false }
                            values.push(val);
                        }
                    }
                    break;
                }
            }
        }
        values = values.sort(sort_by('Name', false, function (a) { return a }));
        var val = { Name: tab.allOptions, isCheck: true }
        values.unshift(val);
        return values;
    }
    tab.checkTypeAndLang = function (col) {
        if (col.Type == "Boolean") {
            return tab.getTranslateBoolean(col.Value);
        }
        return col.Value;

    }
    tab.getTranslateBoolean = function (val) {
        if (val == "לא")
            return tableResources.No;
        if (val == "כן")
            return tableResources.Yes;
        return val;
    }



    tab.getColumnsIndex = function () {
        if (tab.Table.length > 0) {
            tab.colIndexes.total = tab.Table[0].Fields.length;
            tab.colIndexes.min = tab.isGroup ? 1 : 0;
            tab.colIndexes.max = tab.tablesClient.maxColToShow - 1;

            if (tab.colIndexes.total <= tab.tablesClient.maxColToShow) {
                tab.hasHiddensCol = false;
                return;
            }

            tab.hasHiddensCol = true;
            var hiddenCol = tab.colIndexes.total - tab.tablesClient.maxColToShow;
            var divHiddenCol = 0;
            if (hiddenCol % 2 == 0)
                divHiddenCol = hiddenCol / 2 - 1;
            else
                divHiddenCol = (hiddenCol - 1) / 2;
            tab.colIndexes.minRight = tab.tablesClient.maxColToShow;
            tab.colIndexes.maxRight = tab.tablesClient.maxColToShow + divHiddenCol;
            tab.colIndexes.minLeft = tab.colIndexes.maxRight + 1;
            tab.colIndexes.maxLeft = tab.colIndexes.total - 1;

            for (var i = 0; i < tab.Table.length; i++) {
                tab.Table[i].hasHiddensCol = false;
                for (var j = tab.colIndexes.minRight; j <= tab.colIndexes.maxLeft; j++) {
                    if (tab.Table[i].Fields[j] && tab.Table[i].Fields[j].Value.replace(/<\/?[^>]+(>|$)/g, "") != '') {
                        tab.Table[i].hasHiddensCol = true;
                        break;
                    }
                }
            }
        }
    };
    //#endregion

    //#region Filter
    tab.openFilter = function (filter) {
        var isAlreadyOpen = filter.isOpen;
        for (var i = 0; i < tab.Filters.length; i++) {
            tab.Filters[i].isOpen = false;
        }
        if (!isAlreadyOpen)
            filter.isOpen = true;
    }

    tab.keypressFilter = function ($event, filter, value) {
        if ($event.keyCode == 13 || $event.keyCode == 32) {
            tab.doFilter(filter, value);
            $event.preventDefault();
        }
        else if ($event.keyCode == 27) {
            showFilterCategory = false;
            filter.isOpen = false;
            $($event.currentTarget).parent().siblings('.filterCategory').focus();
        }
    }

    tab.doFilter = function (filter, value) {
        var isAlreadyCheck = value.isCheck;
        for (var i = 0; i < filter.Values.length; i++) {
            filter.Values[i].isCheck = false;
        }

        if (value.Name == tab.allOptions) {
            filter.Selected = false;
            value.isCheck = true;
            filter.SelectedValue = tab.allOptions;
        }
        else if (isAlreadyCheck) {
            filter.Selected = false;
            filter.Values[0].isCheck = true;
            filter.SelectedValue = tab.allOptions;
        }
        else {
            value.isCheck = true;
            filter.Selected = true;
            filter.SelectedValue = value.Name;
        }

        tab.doFilterFull();
    }

    tab.getSearchKeyMobile = function () {
        tab.isSearchKeyMobile = !tab.isSearchKeyMobile;
    }

    $scope.$watch('tab.searchKey', function () {
        if (tab.searchKey == 'חיפוש')
            return;

        if (tab.searchKey.replace(/[&\/\\#,+()$~%.'":*?<>{}]/ig, '') == "") {
            tab.searchKey = "";

        }

        tab.doFilterFull();
    });

    tab.doFilterFull = function () {
        for (var i = 0; i < tab.Table.length; i++) {
            tab.Table[i].display = true;
            for (var j = 0; j < tab.Filters.length; j++) {
                if (tab.Filters[j].Selected) {
                    for (var k = 0; k < tab.Table[i].Fields.length; k++) {
                        if (tab.Table[i].Fields[k].Caption == tab.Filters[j].Name && tab.checkTypeAndLang(tab.Table[i].Fields[k]).indexOf(tab.Filters[j].SelectedValue) == -1) {
                            tab.Table[i].display = false;
                            break;
                        }
                    }
                }
                //tab.Filters[j].isOpen = false;
            }
        }

        for (var i = 0; i < tab.Table.length; i++) {
            if (tab.Table[i].display) {
                var display = false;
                for (var j = 0; j < tab.Table[i].Fields.length; j++) {
                    var valToCompare = tab.checkTypeAndLang(tab.Table[i].Fields[j]);
                    if (valToCompare != null && valToCompare.toLowerCase().replace(/(<([^>]+)>)/ig, '').indexOf(tab.searchKey.toLowerCase()) != -1) {
                        display = true;
                        break;
                    }
                }
                tab.Table[i].display = display;
            }
        }

        if (tab.isGroup) {
            if (!tab.isNestedGroup)
                tab.getAllGroupTableLength();
            else
                tab.getAllGroupsAndSubGroupsTableLength();
        }

        for (var i = 0; i < tab.groups.length; i++) {
            if (!tab.isNestedGroup)
                tab.doPaging(tab.groups[i]);
            else {
                for (var j = 0; j < tab.groups[i].subGroups.length; j++) {
                    tab.doPaging(tab.groups[i].subGroups[j]);
                }
            }
        }
    }

    tab.getAllGroupTableLength = function () {
        for (var i = 0; i < tab.groups.length; i++) {
            var count = 0;
            for (var j = 0; j < tab.groups[i].Table.length; j++) {
                if (tab.groups[i].Table[j].display)
                    count++;
            }
            tab.groups[i].Length = count;
            tab.groups[i].Disable = count == 0;
        }
    }

    tab.getAllGroupsAndSubGroupsTableLength = function () {
        for (var i = 0; i < tab.groups.length; i++) {
            var count = 0;

            for (var j = 0; j < tab.groups[i].subGroups.length; j++) {
                var subCount = 0;

                for (var a = 0; a < tab.groups[i].subGroups[j].Table.length; a++) {
                    if (tab.groups[i].subGroups[j].Table[a].display)
                        subCount++;
                }

                count += subCount;
                tab.groups[i].subGroups[j].Length = subCount;
                tab.groups[i].subGroups[j].Disable = count == 0;
            }

            tab.groups[i].Length = count;
            tab.groups[i].Disable = count == 0;
        }
    }
    //#endregion

    //#region Paging
    tab.doPaging = function (group) {
        group.displayPaging = true;
        if (tab.tablesClient.rowPaging == 0) {
            group.hasPaging = false;
            return;
        }

        var displayNum = 0
        for (var i = 0; i < group.Table.length; i++) {
            if (group.Table[i].display) {
                displayNum++;
            }
        }
        if (displayNum == 0) {
            group.hasPaging = false;
        }
        else {
            group.hasPaging = true;
            group.displayPaging = true;
            var rowPaging = tab.tablesClient.rowPaging;
            if (rowPaging >= displayNum) {
                // group.hasPaging = true;
                group.displayPaging = false;
            }
            else {
                var div = (displayNum / rowPaging | 0);
                var mod = (displayNum % rowPaging == 0) ? 0 : 1;
                var pagingNum = div + mod;
                group.paging = [];
                for (var i = 0; i < pagingNum; i++) {
                    var l = tableResources.pageNumTitle + (i + 1) + tableResources.pageOfTitle + pagingNum;
                    var p = { index: i, active: (i == 0), label: l };
                    group.paging.push(p);
                }
            }
        }
    }

    tab.getPaging = function (group) {
        if (group === undefined)
            return [];

        var p = [];
        var activeIndex = 0;
        for (var i = 0; i < group.paging.length; i++) {
            if (group.paging[i].active) {
                activeIndex = group.paging[i].index;
                break;
            }
        }

        var winWidth = $(window).width();
        var min = 0;
        var max = group.paging.length;

        if (winWidth > 480) { //wide screen display
            if (activeIndex <= 4) {
                var min = 0;
                var max = (group.paging.length > 9) ? 10 : group.paging.length;
            }
            else {
                var lastIndex = group.paging[group.paging.length - 1].index;
                if (lastIndex - activeIndex < 5) {
                    var min = lastIndex - 9;
                    var max = lastIndex + 1;
                }
                else {
                    var min = activeIndex - 4;
                    var max = activeIndex + 6;
                }
            }
        }
        else {//mobile display, show 3 numbers
            if (activeIndex < 2) {
                var min = 0;
                var max = (group.paging.length > 2) ? 3 : group.paging.length;
            }
            else {
                var lastIndex = group.paging[group.paging.length - 1].index;
                if (lastIndex - activeIndex < 2) {
                    var min = lastIndex - 2;
                    var max = lastIndex + 1;
                }
                else {
                    var min = activeIndex - 1;
                    var max = activeIndex + 2;
                }
            }

        }

        if (min < 0)
            min = 0;

        for (var i = min; i < max; i++) {
            p.push(group.paging[i]);
        }

        return p;
    }

    tab.getPagingIndex = function (group, p, $event) {
        tab.tableFocus($event);

        for (var i = 0; i < group.paging.length; i++) {
            group.paging[i].active = false;
        }
        p.active = true;
    }

    tab.getPagingFirst = function (group, $event) {
        if (group.paging[0].active)
            return;

        tab.tableFocus($event);

        for (var i = 0; i < group.paging.length; i++) {
            group.paging[i].active = false;
        }

        group.paging[0].active = true;
    }

    tab.getPagingEnd = function (group, $event) {
        if (group.paging[group.paging.length - 1].active)
            return;

        tab.tableFocus($event);

        for (var i = 0; i < group.paging.length; i++) {
            group.paging[i].active = false;
        }

        group.paging[group.paging.length - 1].active = true;
    }

    tab.getPagingNext = function (group, $event) {
        if (group.paging[group.paging.length - 1].active)
            return;

        tab.tableFocus($event);

        var activeIndex = -1;
        for (var i = 0; i < group.paging.length; i++) {
            if (group.paging[i].active) {
                activeIndex = group.paging[i].index + 1;
            }
            group.paging[i].active = false;
            if (group.paging[i].index == activeIndex) {
                group.paging[i].active = true;
            }
        }
    }

    tab.getPagingPrev = function (group, $event) {
        if (group.paging[0].active)
            return;

        tab.tableFocus($event);

        var activeIndex = -1;
        for (var i = group.paging.length - 1; i >= 0; i--) {
            if (group.paging[i].active) {
                activeIndex = group.paging[i].index - 1;
            }
            group.paging[i].active = false;
            if (group.paging[i].index == activeIndex) {
                group.paging[i].active = true;
            }
        }
    }
    //#endregion

    tab.getRows = function (group) {
        if (group === undefined)
            return [];

        if (!group.hasPaging)
            return group.Table;

        var rows = [];
        var index = 0;
        var activeIndex = 0;
        var rowPaging = tab.tablesClient.rowPaging;
        var rowsNum = 0;

        for (var i = 0; i < group.paging.length; i++) {
            if (group.paging[i].active) {
                activeIndex = group.paging[i].index;
                break;
            }
        }

        for (var i = 0; i < group.Table.length; i++) {
            if (group.Table[i].display) {
                rowsNum++;
                if (index == activeIndex) {
                    rows.push(group.Table[i]);
                }
            }
            if (rowsNum == rowPaging) {
                rowsNum = 0;
                index++;
            }
            if (index > activeIndex)
                break;
        }

        return rows;
    }

    tab.doRowHtml = function () {
        var firstTD = $('.tableNormal table tr:first-child td:first-child:visible');

        if (firstTD.length == 0)
            return;

        $timeout(function () {
            for (var i = 0; i < firstTD.length; i++) {
                var val = firstTD.eq(i).html();
                firstTD.eq(i).html(val.trim());
            }
        });

        var td = $('.tableNormal table tr.withHidden td:first-child');
        var collapse_tr = $('.tableNormal table tr.collapse-tr');

        if (td.length == 0)
            return;

        for (var i = 0; i < td.length; i++) {
            td.eq(i).attr('id', 'tableTD' + i);
            collapse_tr.eq(i).attr('aria-describedby', 'tableTD' + i);
            collapse_tr.eq(i).attr('aria-hidden', 'true');
        }


    };

    tab.printTitle = function (index) {
        if ($scope.close[index] == true) {
            return closeMoreInfo_resx;
        }
        else {
            return openMoreInfo_resx;
        }
    }

    tab.doColHtml = function () {
        $('.tableNormal .colfile, .tableNormal .collink').click(function (e) {
            e.stopPropagation();
        });
        if (window.hasOwnProperty('schoolColor') && schoolColor != undefined && schoolColor != '') {
            $(".tableNormal .table-lg tr th").css({ "border-color": schoolColor, "background-color": schoolColor });
            $(".tableFiltering").css({ "border-top-color": schoolColor, "border-bottom-color": schoolColor });
            $(".tableMessages .table-lg tr th").css({ "border-color": schoolColor, "background-color": schoolColor });
        }

    };

    tab.doGroupHtml = function () {
        addAriaControls('tableHeader', 'tableContent', 'true');
        if (window.hasOwnProperty('schoolColor') && schoolColor != undefined && schoolColor != '') {
            $(".tableNormal .table-lg tr th").css({ "border-color": schoolColor, "background-color": schoolColor });
        }
    };



    tab.toggleTR = function (row, $event, $index) {
        $scope.close[$index] = !$scope.close[$index];
        var tr = $event.currentTarget;

        if (!row.hasHiddensCol && $(tr.parentNode.parentNode).attr('class') === 'table-lg')
            return;

        if (row.Fields < 2 && $(tr.parentNode.parentNode).attr('class') === 'table-scrl')
            return;

        $(tr).next(".collapse-tr").find(".expand-row").slideToggle();

        if ($(tr).children('.expand-row-arrow').find(".icon-arrow").is(".icon-down"))//open row
        {
            $(tr).children('.expand-row-arrow').addClass("open");
            $(tr).next(".collapse-tr").children("td").addClass("open");
            $(tr).children('.expand-row-arrow').find(".icon-arrow").removeClass('icon-down');
            $(tr).children('.expand-row-arrow').find(".icon-arrow").addClass('icon-up');
            $(tr).children('.expand-row-arrow').find(".icon-arrow").find(".openAllTableScrl").hide();
            $(tr).children('.expand-row-arrow').find(".icon-arrow").find(".closeAllTableScrl").show();
            $(tr).css("box-shadow", "0 2px 21px 1px rgba(106, 143, 169, 0.27)");
            $(tr).children('.expand-row-arrow').find(".link-wrap").attr("title", $(tr).children('.expand-row-arrow').find(".icon-arrow").find(".closeAllTableScrl").text());
            $(this).find('a');

            $(tr).next(".collapse-tr").attr('aria-hidden', 'false');
            $(tr).attr('aria-expanded', 'true');
        }
        else if ($(tr).children('.expand-row-arrow').find(".icon-arrow").is(".icon-up")) {
            $(tr).children('.expand-row-arrow').removeClass("open");
            $(tr).next(".collapse-tr").children("td").removeClass("open");
            $(tr).children('.expand-row-arrow').find(".icon-arrow").removeClass('icon-up');
            $(tr).children('.expand-row-arrow').find(".icon-arrow").addClass('icon-down');
            $(tr).children('.expand-row-arrow').find(".icon-arrow").find(".openAllTableScrl").show();
            $(tr).children('.expand-row-arrow').find(".icon-arrow").find(".closeAllTableScrl").hide();
            $(tr).children('.expand-row-arrow').find(".link-wrap").attr("title", $(tr).children('.expand-row-arrow').find(".icon-arrow").find(".openAllTableScrl").text());
            $(tr).css("box-shadow", "none");
            $(tr).next(".collapse-tr").attr('aria-hidden', 'true');
            $(tr).attr('aria-expanded', 'false');
        }
    };

    tab.getTableGroup = function ($event) {
        var tableGroup = $($event.currentTarget);

        if (!tableGroup.hasClass('disable')) {
            tableGroup.parent().children(".tableGroup-line .tableNormal").slideToggle(function () {
                var firstTD = $(this).find('table tr:first-child td:first-child:visible');

                if (firstTD.length > 0) {
                    var val = firstTD.eq(0).html();
                    firstTD.eq(0).html(val.trim());
                }
            });
            tableGroup.parent().toggleClass("active");
            tableGroup.children('a').children('.icon-plus').toggleClass("icon-x");

            if (tableGroup.find('.collapse-group').css("display") == "none") {
                tableGroup.find('.collapse-group').css("display", "block");
                tableGroup.find('.expand-group').css("display", "none");
                tableGroup.children('a').children(".group-link-wrap").attr("title", tableGroup.find(".collapse-group").text());
            }
            else {
                tableGroup.find('.collapse-group').css("display", "none");
                tableGroup.find('.expand-group').css("display", "block");
                tableGroup.children('a').children('.group-link-wrap').attr("title", tableGroup.find(".expand-group").text());
            }

            var tableContent = tableGroup.next();
            var ariahidden = tableContent.attr('aria-hidden');

            if (ariahidden == 'true') {
                tableContent.attr('aria-hidden', 'false');
                tableGroup.attr('aria-expanded', 'true');
                tableContent.focus();
            }
            else {
                tableContent.attr('aria-hidden', 'true');
                tableGroup.attr('aria-expanded', 'false');
            }
        }
    };

    tab.getTableSubGroup = function ($event) {
        var tableGroup = $($event.currentTarget);

        if (!tableGroup.hasClass('disable')) {
            tableGroup.parent().children(".doubleGrouping").slideToggle();
            tableGroup.parent().toggleClass("active");
            tableGroup.children('a').children('.icon-plus').toggleClass("icon-x");

            if (tableGroup.find('.collapse-group').css("display") == "none") {
                tableGroup.find('.collapse-group').css("display", "block");
                tableGroup.find('.expand-group').css("display", "none");
                tableGroup.children('a').children(".group-link-wrap").attr("title", tableGroup.find(".collapse-group").text());
            }
            else {
                tableGroup.find('.collapse-group').css("display", "none");
                tableGroup.find('.expand-group').css("display", "block");
                tableGroup.children('a').children('.group-link-wrap').attr("title", tableGroup.find(".expand-group").text());
            }

            var ariahidden = tableGroup.parent().children(".doubleGrouping").attr('aria-hidden');

            if (ariahidden == 'true') {
                tableGroup.parent().children(".doubleGrouping").attr('aria-hidden', 'false');
                tableGroup.attr('aria-expanded', 'true');
                tableGroup.parent().children(".doubleGrouping").focus();
            }
            else {
                tableGroup.parent().children(".doubleGrouping").attr('aria-hidden', 'true');
                tableGroup.attr('aria-expanded', 'false');
            }
        }


    }

    tab.hasValue = function (col) {
        if (isNullOrEmpty(col.Value))
            return '';
        return col.Value.replace(/<\/?[^>]+(>|$)/g, "") != '';
    };

    tab.tableFocus = function ($event) {
        var paggingElement = $event.currentTarget;

        var table = $(paggingElement).parents('.tableGroup-line');
        if (table.length == 0)
            table = $(paggingElement).parents('.tableNormal');
        if (table.length == 0)
            table = $(paggingElement).parents('.tableMessages');

        if (location.host.indexOf('edit') >= 0) {
            table[0].scrollIntoView(true);

            //consider the height menu
            var Y = (window.scrollY || window.pageYOffset);
            if (table.offset().top - 170 < Y) {
                $(window).scrollTop($(window).scrollTop() - 170);
            }
        }
        else {
            $('html, body').animate({
                scrollTop: (table.offset().top - 170)
            }, 0);
        }
    }

    tab.ChangeSearchIcon = function ($event) {
        if ($($event.currentTarget).val()) {
            $($event.currentTarget).parent().find(".searchFilterIconTable").addClass('keyPress');
        }
        else {
            $($event.currentTarget).parent().find(".searchFilterIconTable").removeClass('keyPress');
        }
    }

    tab.BlurSearch = function ($event) {
        if ($($event.currentTarget).val()) {
            $($event.currentTarget).parent().find(".searchFilterIconTable span").text($($event.currentTarget).parent().find(".hdnEmptySearchTxt").text());
        }
        else {
            $($event.currentTarget).parent().find(".searchFilterIconTable span").text($($event.currentTarget).parent().find(".hdnSearchTxt").text());
        }
    }

    tab.DoSearch = function ($event) {
        if ($(window).width() < 768) {
            $($event.currentTarget).parent().find(".tableFiltering .filters").toggle();
            $($event.currentTarget).parent().find(".searchFilterIconTable").toggleClass('keyPress');
            $($event.currentTarget).parent().find(".serachFilterMobile").toggle();
            $($event.currentTarget).parent().find(".serachFilterMobile").val('');
            tab.searchKey = "";
        }
        else {
            if ($($event.currentTarget).parent().find(".searchFilterIconTable").hasClass("keyPress") == true) {
                $($event.currentTarget).parent().find(".searchFilterDesktop input").val('');
                tab.searchKey = '';
                $($event.currentTarget).parent().find(".searchFilterIconTable").removeClass('keyPress');
                $($event.currentTarget).parent().find(".searchFilterIconTable span").text($($event.currentTarget).parent().find(".hdnSearchTxt").text());
            }
        }
    }

    tab.getRowMessage = function (row) {
        var webId = (tab.IsSchoolPage && row.webId) ? row.webId : tab.tablesClient.dataSource.WebId;
        var listId = (tab.IsSchoolPage && row.listId) ? row.listId : tab.tablesClient.dataSource.ListId;
        var itemId = row.ItemID;
        var url = tab.tablesClient.itemPageUrl + '?WebID=' + webId + '&ListID=' + listId + '&ItemID=' + itemId;
        window.location = url;
    }
}

angular
    .module(['ngResource'])
    .controller('tablesCtrl', tablesCtrl);

$(document).ready(function () {
    $(window).resize(function () {
        if ($(window).width() > 768) {
            $(".tableFiltering .filters").show();
            $(".searchFilterIconTable").removeClass('keyPress');
            $(".serachFilterMobile").hide();
        }
    });




});
$(document).keyup(function (e) {
    if (e.key === "Escape") {
        $('.filterCategory').each(function () {

            if ($(this).hasClass("smallDD_open"))
                $(this).click();
        });

    }


});

$(window).on('load', function () {
    if (window.hasOwnProperty('schoolColor') && schoolColor != undefined && schoolColor != '') {
        $(".tableFiltering").css({ "border-top-color": schoolColor, "border-bottom-color": schoolColor });
        $(".tableNormal .table-lg tr th").css({ "border-color": schoolColor, "background-color": schoolColor });
        $(".tableMessages .table-lg tr th").css({ "border-color": schoolColor, "background-color": schoolColor });

    }
});