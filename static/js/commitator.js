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
  }
  ;
})();


///////////////////////////
//  Update info methods  //
///////////////////////////

function update_all() {
  var org = document.getElementById('org_field').value;
  if (org) {
    // Pick up the data from the datarange widget. If no value (<span> starts with
    // Pick...), then by default get the last 7 days
    var datarange = $('#reportrange span')[0];
    var since = new Date();
    var until = new Date();

    if(datarange.textContent[0] != 'P') {
      since = new Date(datarange.textContent.split(' - ')[0]);
      until = new Date(datarange.textContent.split(' - ')[1]);
    }
    else {
      since.setDate(until.getDate() - 7);
    }

    // Get all the data of the organization from GitHub
    myApp.showPleaseWait();
    $.getJSON('/api/org?org=' + org + '&info=all&since=' + since + '&until=' + until, function(org_info){
      update_org_table(org, org_info);
      update_global_commits_per_repo(since, until, org_info);
      update_global_commits_per_user(since, until, org_info);
      var content = "Total number of commits per repository (" +
          since.toDateString() + " - " + until.toDateString() + ')';

      if (!document.getElementById("h_total_commits")) {
        var h = "<h3 id=\"h_total_commits\">" + content + "</h3>";
        $("#commits_per_repo_chart").prepend(h);
      }
      // Just update with the new dates
      else {
        var h = document.getElementById("h_total_commits");
        h.textContent = content;
      }
    });
    myApp.showPleaseWait();
  }
  else {
    $("#org_field_div").addClass("has-error");
    $('#org_field').popover('show');
  }
}

function update_org_table(org, org_info) {

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

    // Create table header
    var header = document.createElement('thead');
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.setAttribute('colspan', '2')
    th.textContent = org;
    if (org_info['basic_info']['location']) {
      th.textContent = th.textContent + ', located in ' + org_info['basic_info']['location'];
    }
    if (org_info['basic_info']['email']) {
      h.textContent = th.textContent + ' - ' + org_info['basic_info']['email'];
    }
    tr.appendChild(th);
    header.appendChild(tr);
    t.appendChild(header);

    // Create table contents
    body = document.createElement('tbody');
    created_at = new Date(org_info['basic_info']['created_at']);
    add_row(body, "Created", created_at.toDateString());
    add_row(body, "Number of public repositories", org_info['basic_info']['public_repos']);
    add_row(body, "Number of public members", Object.keys(org_info['members']).length);
    add_row(body, "Number of followers", org_info['basic_info']['followers']);
    t.appendChild(body);
  }
}

//Updates the chart representing commits per repo (first page returned by GH API)
function update_global_commits_per_repo(since, until, org_info) {
  //Prepare the data for the nvd3 plot
  chart_data = {'key': 'Total commits per repository', 'values': []};
  $.each(org_info['repos'], function(k, v) {
    //Omit repositories without commits
    if (v['commits'].length) {
      var value = {};
      value['label'] = k;
      value['value'] = v['commits'].length;
      chart_data['values'].push(value);
    }
  });
  build_discrete_bar_chart('commits_per_repo_chart', [chart_data]);
}

//Updates the chart representing commits per user (first page returned by GH API)
function update_global_commits_per_user(since, until, org_info) {
  //Prepare the data for the nvd3 plot
  commits_by_author = {}
  $.each(org_info['repos'], function(k, v) {
    for (var i = 0; i < v['commits'].length; i++) {
      commit = v['commits'][i];
      if (commit['author'] != undefined) {
        author_login = commit['author']['login'];
        if (commits_by_author[author_login]) {
          commits_by_author[author_login] += 1;
        } else {
          commits_by_author[author_login] = 1;
        }
      }
    }
  });

  chart_data = {'key': 'Total commits per user', 'values': []};
  $.each(commits_by_author, function(k, v) {
    var value = {};
    value['label'] = k;
    value['value'] = v;
    chart_data['values'].push(value);
  });
  build_discrete_bar_chart('commits_per_user_chart', [chart_data]);
}


///////////////////////
//  Drawing methods  //
///////////////////////

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

$("#authorize_button").click(function(event){
    // Will just execute the first step authentication of GitHub OAuth
    $.get('/api/user/token', function(data, status){
        console.log(data);
    });
});
