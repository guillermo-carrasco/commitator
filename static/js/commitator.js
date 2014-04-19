////////////////////////////////////
//  Fetching information methods  //
////////////////////////////////////

var myApp;
myApp = myApp || (function () {
  var pleaseWaitDiv = $('<div class="modal fade bs-example-modal-sm" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel" aria-hidden="true"><div class="modal-dialog modal-sm"><div class="modal-content"><h3>Fetching data...</h3><div class="progress progress-striped active"><div class="progress-bar progress-bar-info" role="progressbar" aria-valuenow="10" aria-valuemin="0" aria-valuemax="100" style="width: 100%"><span class="sr-only"></span></div></div></div></div></div>');
  return {
    showPleaseWait: function() {
      pleaseWaitDiv.modal();
    },
      hidePleaseWait: function () {
        pleaseWaitDiv.modal('hide');
      },
  };
})();

function get_commits_per_repo(chart_id, since, until, org) {
  myApp.showPleaseWait();
  var get_commits_uri = '/api/org/repos/commits?org=' + org;
  if (since && until) {
    get_commits_uri += '&since=' + since + '&until=' + until;
  }
  $.getJSON(get_commits_uri, function(data) {
    //Prepare the data for the nvd3 plot
    chart_data = {'key': 'Total commits per repository', 'values': []};
    $.each(data, function(k, v) {
      //Omit repositories without commits
      if (v.length) {
        var value = {};
        value['label'] = k;
        value['value'] = v.length;
        chart_data['values'].push(value);
      }
    });
    build_discrete_bar_chart(chart_id, [chart_data]);
  });
}


///////////////////////////
//  Update info methods  //
///////////////////////////
function update_all() {
  var org = document.getElementById('org_field').value;
  if (org) {
    // Pick up the data from the datarange widget. If no value (<span> starts with
    // Pick...), then by default get the last 7 days
    var datarange = $('#reportrange span')[0]
    var since = new Date();
    var until = new Date();
    if(datarange.textContent[0] != 'P') {
      since = new Date(datarange.textContent.split(' - ')[0]);
      until = new Date(datarange.textContent.split(' - ')[1]);
    }
    else {
      since.setDate(until.getDate() - 7);
    }
    update_org_table(org);
    update_global_commits_per_repo(since, until, org);
    var content = "Total number of commits per repository (" + 
        since.toDateString() + " - " + until.toDateString() + ')';
    if (!document.getElementById("h_total_commits")) {
      var h = "<h3 id=\"h_total_commits\">" + content + "</h3>";
      $("#total_commits_chart").prepend(h);
    }
    // Just update with the new dates
    else {
      var h = document.getElementById("h_total_commits");
      h.textContent = content;
    }
  }
  else {
    $("#org_field_div").addClass("has-error");
    $('#org_field').popover('show');
  }
}

function update_org_table(org) {

  var t = document.getElementById('org_table');
  // Has the organization changed?
  var h = $('#org_table thead th');
  var org_changed = h.text().split(' ')[0] !== org;

  if (t.childElementCount == 0 || org_changed) {

    $('#org_table').empty();

    function add_row(body, k, v) {
      var td = document.createElement('td');
      var tr = document.createElement('tr');
      td.textContent = k;
      tr.appendChild(td);
      td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
      body.appendChild(tr);
    }

    $.getJSON('/api/org?org=' + org, function(org_data){
      $.getJSON('/api/org/members?org=' + org, function(org_members){

        // Create table header
        var header = document.createElement('thead');
        var tr = document.createElement('tr');
        var th = document.createElement('th');
        th.setAttribute('colspan', '2')
        th.textContent = org + ' organization';
        if (org_data['location']) {
          th.textContent = th.textContent + ', located in ' + org_data['location'];
        }
        if (org_data['email']) {
          h.textContent = th.textContent + ' - ' + org_data['email'];
        }
        tr.appendChild(th);
        header.appendChild(tr);
        t.appendChild(header);

        // Create table contents
        body = document.createElement('tbody');
        created_at = new Date(org_data['created_at']);
        add_row(body, "Created at", created_at.toDateString());
        add_row(body, "Number of (public) repositories", org_data['public_repos']);
        add_row(body, "Number of (public) members", Object.keys(org_members).length);
        add_row(body, "Followers", org_data['followers']);
        t.appendChild(body);
        t
      });
    });
  }
}


//Updates the chart representing commits by user (first page returned by GH API)
function update_global_commits_per_repo(since, until, org) {
  var repos = get_commits_per_repo('total_commits_chart', since, until, org);
}


///////////////////////
//  Drawing methods  //
//////////////////////
function build_discrete_bar_chart(chart_id, data) {
  myApp.hidePleaseWait();
  nv.addGraph(function() {
    var chart = nv.models.discreteBarChart()
    .x(function(d) { return d.label })
    .y(function(d) { return d.value })
    .staggerLabels(true)
    .showValues(true)
    .height(600)
    .margin({bottom: 60});

    d3.select('#' + chart_id + ' svg')
    .datum(data)
    .transition().duration(800)
    .call(chart)
    .attr('style', 'height:600');

  nv.utils.windowResize(chart.update);

  return chart;
  });
}

//Datarange picker 
$('#reportrange').daterangepicker(
    {
      ranges: {
      'Today': [moment(), moment()],
      'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
      'Last 7 Days': [moment().subtract('days', 7), moment()],
      'Last 30 Days': [moment().subtract('days', 30), moment()],
      'This Month': [moment().startOf('month'), moment().endOf('month')],
      'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')],
      'This Year': [moment().startOf('year'), moment().endOf('month')],
      'Last Year': [moment().subtract('year', 1).startOf('year'), moment().subtract('year', 1).endOf('year')]
      },
      startDate: moment().subtract('days', 29),
      endDate: moment()
      },
      function(start, end) {
        $('#reportrange span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
        update_all();
      }
);


//////////////////////////
//  Responsive methods  //
//////////////////////////
$("#org_form").submit( function(e) {
  e.preventDefault();
  update_all();
});

$("#org_field").keyup(function(e){
  $("#org_field_div").removeClass('has-error');
  $('#org_field').popover('hide');
});