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

    get_all_data(org, since, until).done(function (org_info, org_members, org_repos) {
      update_org_table(org, org_info, org_members);
      update_global_commits_per_repo(since, until, org_repos);
      update_global_commits_per_user(since, until, org_repos);


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
      myApp.hidePleaseWait();
    });
  } else {
    $("#org_field_div").addClass("has-error");
    $('#org_field').popover('show');
  }
}

function getRequestJSON(full_path, params) {
  params = params || {};
  params['access_token'] = '';
  return $.getJSON(full_path, params);
}

function iterate(full_path, params, results, def) {
  var req = getRequestJSON(full_path, params);

  req.done(function (data, textStatus, jqXHR) {
    results.push.apply(results, data);

    var links = (jqXHR.getResponseHeader('link') || '').split(/\s*,\s*/g);
    var next = '';
    for (var i = 0; i < links.length; i++) {
      if (links[i].indexOf('rel="next"') !=-1) {
        next = /<(.*)>/.exec(links[i])[1];
        break;
      }
    }

    if (!next) {
      if (results.length)
        def.resolve(results);
      else
        def.resolve(data);
    } else {
      iterate(next, params, results, def);
    }
  });

  req.fail(function (jqXHR, textStatus, errorThrown) {
    console.log('Error when fetching ' + full_path + " - " + errorThrown);
    def.resolve([]);
  });
}

function get_github_json(path,  params) {
  var results = [];
  var def = new $.Deferred();
  var req = iterate('https://api.github.com' + path, params, results, def);
  return def;
}

function get_all_data(org, since, until) {
  org_req = get_org_basic_info(org);
  members_req = get_org_members(org);
  org_repos = get_org_repos_with_commits(org, since, until);

  return $.when(org_req, members_req, org_repos);
}

function get_org_basic_info(org) {
  return get_github_json('/orgs/' + org, {});
}

function get_org_members(org) {
  return get_github_json('/orgs/' + org + '/public_members', {});
}

function get_org_repos_with_commits(org, since, until) {
  return get_org_repos(org).then(function (org_repos) {
    return get_repos_commits(org, org_repos, since, until);
  });
}

function get_org_repos(org) {
  return get_github_json('/orgs/' + org + '/repos', {});
}

function get_repos_commits(org, org_repos, since, until) {
  var reqs = [];
  for (var i = 0; i < org_repos.length; i++) {
    reqs.push(get_repo_commits(org, org_repos[i], since, until));
  }

  // Apply converts an array into an arguments list
  return $.when.apply(this, reqs).then(function () {
    return org_repos;
  });
}

function get_repo_commits(org, repo, since, until) {
  params = {'since': since.toISOString(), 'until': until.toISOString()};
  return get_github_json('/repos/' + org + '/' + repo['name'] + '/commits', params).then(function(commits){
    repo['commits'] = commits;
  });
}

function update_org_table(org, org_basic_info, org_members) {
  var t = document.getElementById('org_table');

  // Has the organization changed?
  var h = $('#org_table thead th');
  var org_changed = h.text().split(' ')[0] !== org;

  if (t.childElementCount === 0 || org_changed) {

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
    th.setAttribute('colspan', '2');
    th.textContent = org;
    if (org_basic_info['location']) {
      th.textContent = th.textContent + ', located in ' + org_basic_info['location'];
    }
    if (org_basic_info['email']) {
      h.textContent = th.textContent + ' - ' + org_basic_info['email'];
    }
    tr.appendChild(th);
    header.appendChild(tr);
    t.appendChild(header);

    // Create table contents
    body = document.createElement('tbody');
    created_at = new Date(org_basic_info['created_at']);
    add_row(body, "Created", created_at.toDateString());
    add_row(body, "Number of public repositories", org_basic_info['public_repos']);
    add_row(body, "Number of public members", org_members.length);
    add_row(body, "Number of followers", org_basic_info['followers']);
    t.appendChild(body);
  }
}

//Updates the chart representing commits per repo (first page returned by GH API)
function update_global_commits_per_repo(since, until, org_repos) {
  //Prepare the data for the nvd3 plot
  chart_data = {'key': 'Total commits per repository', 'values': []};
  for (var i = 0; i < org_repos.length; i++) {
    //Omit repositories without commits
    repo = org_repos[i];

    if (repo && repo['commits'].length) {
      var value = {};
      value['label'] = repo['name'];
      value['value'] = repo['commits'].length;
      chart_data['values'].push(value);
    }
  }

  build_discrete_bar_chart('commits_per_repo_chart', [chart_data]);
}

//Updates the chart representing commits per user (first page returned by GH API)
function update_global_commits_per_user(since, until, org_repos) {
  //Prepare the data for the nvd3 plot
  commits_by_author = {};

  for (var i = 0; i < org_repos.length; i++) {
    for (var j = 0; j < org_repos[i]['commits'].length; j++) {
      commit = org_repos[i]['commits'][j];
      if (commit['author']) {
        author_login = commit['author']['login'];
        if (commits_by_author[author_login]) {
          commits_by_author[author_login] += 1;
        } else {
          commits_by_author[author_login] = 1;
        }
      }
    }
  };

  chart_data = {'key': 'Total commits per user', 'values': []};
  $.each(commits_by_author, function(author, num_commits) {
    var value = {};
    value['label'] = author;
    value['value'] = num_commits;
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
