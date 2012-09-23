tvheadend.ContentGroupStore = new Ext.data.JsonStore({
    root:'entries',
    fields: [{name: 'name'}],
    autoLoad: true,
    url:'ecglist'
});

tvheadend.ContentGroupStore.setDefaultSort('name', 'ASC');

tvheadend.epgDetails = function(event) {


    var content = '';
    
    if(event.chicon != null && event.chicon.length > 0)
	content += '<img class="x-epg-chicon" src="' + event.chicon + '">';

    content += '<div class="x-epg-title">' + event.title + '</div>';
    content += '<div class="x-epg-desc">' + event.episode + '</div>';
    content += '<div class="x-epg-desc">' + event.description + '</div>';

    content += '<div class="x-epg-meta">' + event.contentgrp + '</div>';

    if(event.ext_desc != null)
      content += '<div class="x-epg-meta">' + event.ext_desc + '</div>';

    if(event.ext_item != null)
      content += '<div class="x-epg-meta">' + event.ext_item + '</div>';

    if(event.ext_text != null)
      content += '<div class="x-epg-meta">' + event.ext_text + '</div>';

    content += '<div class="x-epg-meta"><a target="_blank" href="' + 
	'http://akas.imdb.org/find?q=' + event.title + '">Search IMDB</a></div>'

    now = new Date();
    if(event.start < now && event.end > now) {
      content += "<div class=\"x-epg-meta\">" +
            "<a href=\"javascript:tvheadend.VLC('stream/channelid/" +
            event.channelid + "')\">Play</a>" + "</div>";
    }

    var confcombo = new Ext.form.ComboBox({
        store: tvheadend.configNames,
        triggerAction: 'all',
        mode: 'local',
        valueField: 'identifier',
        displayField: 'name',
        name: 'config_name',
        emptyText: '(default)',
        value: '',
        editable: false
    });

    var win = new Ext.Window({
	title: event.title,
	bodyStyle: 'margin: 5px',
        layout: 'fit',
        width: 400,
        height: 300,
	constrainHeader: true,
	buttons: [
            confcombo,
	    new Ext.Button({
		handler: recordEvent,
		text: "Record program"
	    })
	],
	buttonAlign: 'center',
	html: content
    });
    win.show();


    function recordEvent() {
	Ext.Ajax.request({
	    url: 'dvr',
	    params: {
                eventId: event.id, 
                op: 'recordEvent', 
                config_name: confcombo.getValue()
            },

	    success:function(response, options) {
		win.close();
	    },

	    failure:function(response, options) {
		Ext.MessageBox.alert('DVR', response.statusText);
	    }
	});
    }

}


/**
 *
 */

tvheadend.epg = function() {
    var xg = Ext.grid;

    var actions = new Ext.ux.grid.RowActions({
        header:'',
	width:20,
        dataIndex: 'actions',
        actions: [
            {
                iconIndex:'schedstate'
            }
        ]
    });

    var epgStore = new Ext.ux.grid.livegrid.Store({
	autoLoad: true,
	url: 'epg',
	bufferSize: 300,
	reader: new Ext.ux.grid.livegrid.JsonReader({
	    root: 'entries',
	    totalProperty: 'totalCount',
	    id: 'id'
	},[
	    {name: 'id'},
	    {name: 'channel'},
	    {name: 'channelid'},
	    {name: 'title'},
	    {name: 'episode'},
	    {name: 'description'},
	    {name: 'ext_desc'},
	    {name: 'ext_item'},
	    {name: 'ext_text'},
	    {name: 'chicon'},
            {name: 'start', type: 'date', dateFormat: 'U' /* unix time */},
            {name: 'end', type: 'date', dateFormat: 'U' /* unix time */},
            {name: 'duration'},
	    {name: 'contentgrp'},
	    {name: 'schedstate'}
	])
   });

    function setMetaAttr(meta, record){
        var now = new Date;
        var start = record.get('start');

        if(now.getTime() > start.getTime()){
            meta.attr = 'style="font-weight:bold;"';
        }
    }

    function renderDate(value, meta, record, rowIndex, colIndex, store){
        setMetaAttr(meta, record);

	var dt = new Date(value);
	return dt.format('l H:i');
    } 

   function renderDuration(value, meta, record, rowIndex, colIndex, store){
       setMetaAttr(meta, record);

       value = Math.floor(value / 60);

       if(value >= 60) {
	   var min = value % 60;
	   var hours = Math.floor(value / 60);

	   if(min == 0) {
	       return hours + ' hrs';
	   }
	   return hours + ' hrs, ' + min + ' min';
       } else {
	   return value + ' min';
       }
    } 

    function renderText(value, meta, record, rowIndex, colIndex, store){
        setMetaAttr(meta, record);

        return value;
    }

    var epgCm = new Ext.grid.ColumnModel([
	actions,
	{
	    width: 250,
	    id:'title',
	    header: "Title",
	    dataIndex: 'title',
	    renderer: renderText
	},{
	    width: 100,
	    id:'episode',
	    header: "Episode",
	    dataIndex: 'episode',
	    renderer: renderText
	},{
	    width: 100,
	    id:'start',
	    header: "Start",
	    dataIndex: 'start',
	    renderer: renderDate
	},{
	    width: 100,
	    hidden:true,
	    id:'end',
	    header: "End",
	    dataIndex: 'end',
	    renderer: renderDate
	},{
	    width: 100,
	    id:'duration',
	    header: "Duration",
	    dataIndex: 'duration',
	    renderer: renderDuration
	},{
	    width: 250,
	    id:'channel',
	    header: "Channel",
	    dataIndex: 'channel',
	    renderer: renderText
	},{
	    width: 250,
	    id:'contentgrp',
	    header: "Content Type",
	    dataIndex: 'contentgrp',
	    renderer: renderText
	}
    ]);


    // Title search box

    var epgFilterTitle = new Ext.form.TextField({
	emptyText: 'Search title...',
	width: 200
    });


    // Channels, uses global store

    var epgFilterChannels = new Ext.form.ComboBox({
	loadingText: 'Loading...',
	width: 200,
	displayField:'name',
	store: tvheadend.channels,
	mode: 'local',
	editable: false,
	triggerAction: 'all',
	emptyText: 'Only include channel...'
    });

    // Tags, uses global store

    var epgFilterChannelTags = new Ext.form.ComboBox({
	width: 200,
	displayField:'name',
	store: tvheadend.channelTags,
	mode: 'local',
	editable: false,
	triggerAction: 'all',
	emptyText: 'Only include tag...'
    });

    // Content groups


    var epgFilterContentGroup = new Ext.form.ComboBox({
	loadingText: 'Loading...',
	width: 200,
	displayField:'name',
	store: tvheadend.ContentGroupStore,
	mode: 'local',
	editable: false,
	triggerAction: 'all',
	emptyText: 'Only include content...'
    });


    function epgQueryClear() {
	epgStore.baseParams.channel    = null;
	epgStore.baseParams.tag        = null;
	epgStore.baseParams.contentgrp = null;
	epgStore.baseParams.title      = null;

	epgFilterChannels.setValue("");
	epgFilterChannelTags.setValue("");
	epgFilterContentGroup.setValue("");
	epgFilterTitle.setValue("");
          
	epgStore.reload();
    }

    epgFilterChannels.on('select', function(c, r) {
	if(epgStore.baseParams.channel != r.data.name) {
	    epgStore.baseParams.channel = r.data.name;
	    epgStore.reload();
	}
    });

    epgFilterChannelTags.on('select', function(c, r) {
	if(epgStore.baseParams.tag != r.data.name) {
	    epgStore.baseParams.tag = r.data.name;
	    epgStore.reload();
	}
    });

    epgFilterContentGroup.on('select', function(c, r) {
	if(epgStore.baseParams.contentgrp != r.data.name) {
	    epgStore.baseParams.contentgrp = r.data.name;
	    epgStore.reload();
	}
    });

    epgFilterTitle.on('valid', function(c) {
	var value = c.getValue();

	if(value.length < 1)
	    value = null;

	if(epgStore.baseParams.title != value) {
	    epgStore.baseParams.title = value;
	    epgStore.reload();
	}
    });

    var epgView = new Ext.ux.grid.livegrid.GridView({
	nearLimit : 100,
	loadMask  : {
	    msg :  'Buffering. Please wait...'
	}
    });

    var panel = new Ext.ux.grid.livegrid.GridPanel({
	enableDragDrop : false,
	cm: epgCm,
	plugins: [actions],
	title: 'Electronic Program Guide',
	iconCls: 'newspaper',
        store : epgStore,
	selModel : new Ext.ux.grid.livegrid.RowSelectionModel(),
	view : epgView,
	tbar: [
	    epgFilterTitle,
	    '-',
	    epgFilterChannels,
	    '-',
	    epgFilterChannelTags,
	    '-',
	    epgFilterContentGroup,
	    '-',
	    {
		text: 'Reset',
		handler: epgQueryClear
	    },
	    '->',
	    {
		text: 'Watch TV',
		iconCls: 'eye',
		handler: function() {
		    new tvheadend.VLC();
		}
	    },
	    '-',
	    {
		text: 'Create AutoRec',
		iconCls: 'wand',
		tooltip: 'Create an automatic recording entry that will ' +
		    'record all future programmes that matches ' +
		    'the current query.',
		handler: createAutoRec
	    },
	    '-',
	    {
		text: 'Help',
		handler: function() {
		    new tvheadend.help('Electronic Program Guide', 'epg.html');
		}
	    }
	],

	bbar : new Ext.ux.grid.livegrid.Toolbar({
	    view : epgView,
	    displayInfo : true
	})
    });

    panel.on('rowclick', rowclicked);


    function rowclicked(grid, index) {
	new tvheadend.epgDetails(grid.getStore().getAt(index).data);
    }

    function createAutoRec() {

	var title = epgStore.baseParams.title ?
	    epgStore.baseParams.title      : "<i>Don't care</i>";
	var channel = epgStore.baseParams.channel ?
	    epgStore.baseParams.channel    : "<i>Don't care</i>";
	var tag = epgStore.baseParams.tag ?
	    epgStore.baseParams.tag        : "<i>Don't care</i>";
	var contentgrp = epgStore.baseParams.contentgrp ?
	    epgStore.baseParams.contentgrp : "<i>Don't care</i>";

	Ext.MessageBox.confirm('Auto Recorder',
			       'This will create an automatic rule that ' +
			       'continuously scans the EPG for programmes ' +
			       'to record that matches this query: ' +
			       '<br><br>' +
			       '<div class="x-smallhdr">Title:</div>' + title + '<br>' +
			       '<div class="x-smallhdr">Channel:</div>' + channel + '<br>' +
			       '<div class="x-smallhdr">Tag:</div>' + tag + '<br>' +
			       '<div class="x-smallhdr">Content Group:</div>' + contentgrp + '<br>' +
			       '<br>' +
			       'Currently this will match (and record) ' + 
			       epgStore.getTotalCount() + ' events. ' +
			       'Are you sure?',

			       function(button) {
				   if(button == 'no')
				       return;
				   createAutoRec2(epgStore.baseParams);
			       }
			      );
    }

    function createAutoRec2(params) {
	/* Really do it */
	params.op = 'createAutoRec';
	Ext.Ajax.request({url: 'dvr', params: params});
    }

    return panel;
}

