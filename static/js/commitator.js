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

    get_all_data(org, since, until).done(function (org_info, org_members, org_repos_with_contributors) {
      myApp.hidePleaseWait();

      if (!org_info) {
        alert("Error when fetching organization data for: " + org);
      } else {
        $("#welcome").slideUp();

        only_nonforked_repos = true;
        only_org_members = false;

        aggregated_data = aggregate_repo_data(org_repos_with_contributors, since, until,
                                              only_nonforked_repos, only_org_members,
                                              org_members);

        update_org_table(org, org_info, org_members);
        update_global_commits_per_repo(aggregated_data.weekly_commits_by_repo, since, until);
        update_global_commits_per_user(aggregated_data.weekly_commits_by_author, since, until);
        update_weekly_commits_per_user(aggregated_data.weekly_commits_by_author);
      }
    });
  } else {
    $("#org_field_div").addClass("has-error");
    $('#org_field').popover('show');
  }
}

function aggregate_repo_data(org_repos, since, until, only_nonforked_repos, only_org_members, org_members) {
  weekly_commits_by_author = {};
  weekly_commits_by_repo = {};

  since_timestamp = since.getTime()/1000;
  until_timestamp = until.getTime()/1000;


  org_members_dict = {};
  if (only_org_members) {
    for (var i = 0; i < org_members.length; i++) {
      org_members_dict[org_members[i]['login']] = true;
    }
  }

  for (var i = 0; i < org_repos.length; i++) {

    if (only_nonforked_repos && org_repos[i]['fork'])
      continue;

    repo_name = org_repos[i]['name'];
    weekly_commits_by_repo[repo_name] = {};

    for (var j = 0; j < org_repos[i]['contributors'].length; j++) {
      author_repo_contributions = org_repos[i]['contributors'][j];
      author_login = author_repo_contributions['author']['login'];

      if (only_org_members && !org_members_dict[author_login]) {
        continue;
      }
      if (!weekly_commits_by_author[author_login])
        weekly_commits_by_author[author_login] = {};

      for (var k = 0; k < author_repo_contributions['weeks'].length; k++) {
        week_contributions = author_repo_contributions['weeks'][k];
        week = parseInt(week_contributions['w']);

        if (week >= since_timestamp && week < until_timestamp) {
          if (!weekly_commits_by_author[author_login][week]) {
            weekly_commits_by_author[author_login][week] = 0;
          }

          if (!weekly_commits_by_repo[repo_name][week]) {
            weekly_commits_by_repo[repo_name][week] = 0;
          }

          weekly_commits_by_author[author_login][week] += week_contributions['c'];
          weekly_commits_by_repo[repo_name][week] += week_contributions['c'];
        }
      }
    }
  }

  // Remove authors with 0 contributions in period
  filtered_weekly_commits_by_author = {};
  $.each(weekly_commits_by_author, function(author, commits_by_week) {
    $.each(commits_by_week, function(week, commits) {
      if (commits) {
        filtered_weekly_commits_by_author[author] = weekly_commits_by_author[author];
      }
    });
  });

  // Remove repos with 0 contributions in period
  filtered_weekly_commits_by_repo = {};
  $.each(weekly_commits_by_repo, function(repo, commits_by_week) {
    $.each(commits_by_week, function(week, commits) {
      if (commits) {
        filtered_weekly_commits_by_repo[repo] = weekly_commits_by_repo[repo];
      }
    });
  });

  return {'weekly_commits_by_author': filtered_weekly_commits_by_author,
          'weekly_commits_by_repo': filtered_weekly_commits_by_repo};
}

function getRequestJSON(full_path, params) {
  params = params || {};
  params['access_token'] = $.cookie('token');
  return $.getJSON(full_path, params);
}

function iterate(full_path, params, results, def) {
  var req = getRequestJSON(full_path, params);

  req.done(function (data, textStatus, jqXHR) {
    if (jqXHR.status == 202) {
      window.setTimeout(iterate, 500, full_path, params, results, def);
    } else {
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
    }
  });

  req.fail(function (jqXHR, textStatus, errorThrown) {
    console.log('Error when fetching ' + full_path + " - " + errorThrown);
    def.resolve(undefined);
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
  org_repos_with_contributors = get_org_repos_with_contributors(org);

  return $.when(org_req, members_req, org_repos_with_contributors);
}

function get_org_basic_info(org) {
  return get_github_json('/orgs/' + org, {});
}

function get_org_members(org) {
  return get_github_json('/orgs/' + org + '/public_members', {});
}

function get_org_repos(org) {
  return get_github_json('/orgs/' + org + '/repos', {});
}

function get_org_repos_with_contributors(org) {
  return get_org_repos(org).then(function (repos) {
    return get_org_contributor_stats_for_repos(org, repos || []);
  });
}

function get_org_contributor_stats_for_repos(org, org_repos) {
  var reqs = [];
  for (var i = 0; i < org_repos.length; i++) {
    reqs.push(get_repo_contributor_stats(org, org_repos[i]));
  }

  // Apply converts an array into an arguments list
  return $.when.apply(this, reqs).then(function () {
    return org_repos;
  });
}

function get_repo_contributor_stats(org, repo) {
  return get_github_json('/repos/' + org + '/' + repo['name'] + '/stats/contributors', {}).then(function(contributors){
    repo['contributors'] = (contributors || []);
  });
}


function update_org_table(org, org_basic_info, org_members) {
  var t = document.getElementById('org_table');

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
  th.textContent = org_basic_info['name'];

  if (org_basic_info['location']) {
    th.textContent = th.textContent + '  (' + org_basic_info['location'] + ')';
  }

  if (org_basic_info['email']) {
    th.textContent = th.textContent + ' - ' + org_basic_info['email'];
  }

  tr.appendChild(th);
  header.appendChild(tr);
  t.appendChild(header);

  // Create table contents
  body = document.createElement('tbody');
  created_at = new Date(org_basic_info['created_at']);
  add_row(body, "Created", created_at.toDateString());

  if (org_basic_info['blog'])
    add_row(body, "Web", org_basic_info['blog']);

  add_row(body, "Number of public repositories", org_basic_info['public_repos']);
  add_row(body, "Number of public members", org_members.length);

  t.appendChild(body);

}

//Updates the chart representing commits per repo
function update_global_commits_per_repo(weekly_commits_by_repo, since, until) {
  total_commits_by_repo = {};
  $.each(weekly_commits_by_repo, function(repo, commits_by_week) {
    total = 0;
    $.each(commits_by_week, function(week, commits) {
      total += commits;
    });

    total_commits_by_repo[repo] = total;
  });

  chart_data = {'key': 'Total commits per repository', 'values': []};
  $.each(total_commits_by_repo, function(repo, total_commits) {
    if (total_commits) {
      var value = {};
      value['label'] = repo;
      value['value'] = total_commits;
      chart_data['values'].push(value);
    }
  });

  build_discrete_bar_chart('commits_per_repo_chart', [chart_data]);

  var content = "Number of commits per repository (" +
        since.toDateString() + " - " + until.toDateString() + ')';

  var h = '';
  if (!document.getElementById("h_commits_per_repo")) {
    h = "<h3 id=\"h_commits_per_repo\">" + content + "</h3>";
    $("#commits_per_repo_chart").prepend(h);
  }
  else {
    h = document.getElementById("h_commits_per_repo");
    h.textContent = content;
  }
}

//Updates the chart representing commits per user
function update_global_commits_per_user(weekly_commits_by_author, since, until) {
  //Prepare the data for the nvd3 plot
  total_commits_by_author = {};
  $.each(weekly_commits_by_author, function(author, commits_by_week) {
    total = 0;
    $.each(commits_by_week, function(week, commits) {
      total += commits;
    });

    total_commits_by_author[author] = total;
  });

  chart_data = {'key': 'Total commits per user', 'values': []};
  $.each(total_commits_by_author, function(author, num_commits) {
    if (num_commits) {
      var value = {};
      value['label'] = author;
      value['value'] = num_commits;
      chart_data['values'].push(value);
    }
  });

  build_discrete_bar_chart('commits_per_user_chart', [chart_data]);

  var content = "Number of commits per user (" +
        since.toDateString() + " - " + until.toDateString() + ')';

  var h;
  if (!document.getElementById("h_commits_per_user")) {
    h = "<h3 id=\"h_commits_per_user\">" + content + "</h3>";
    $("#commits_per_user_chart").prepend(h);
  }
  else {
    h = document.getElementById("h_commits_per_user");
    h.textContent = content;
  }
}

function update_weekly_commits_per_user(weekly_commits_by_author) {
  //Prepare the data for the nvd3 plot

  chart_data = [];
  $.each(weekly_commits_by_author, function(author, weekly_commits) {
    author_data = [];
    $.each(weekly_commits, function(week, num_commits) {
      author_data.push({x: week*1000, y: num_commits});
    });

    chart_data.push({values: author_data, key: author});
  });

  build_date_line_chart('weekly_commits_per_user', chart_data);
}


///////////////////////
//  Drawing methods  //
///////////////////////

function build_discrete_bar_chart(chart_id, data) {
  d3.select('#' + chart_id + ' svg').select('.nvd3').remove();
  nv.addGraph(function() {
    var chart = nv.models.discreteBarChart()
      .x(function(d) { return d.label; })
      .y(function(d) { return d.value; })
      .staggerLabels(true)
      .showValues(true)
      .height(600)
      .margin({bottom: 60})
      .valueFormat(d3.format('d'));

    d3.select('#' + chart_id + ' svg')
      .datum(data)
      .transition().duration(800)
      .call(chart)
      .attr('style', 'height:600');

    nv.utils.windowResize(chart.update);
    return chart;
  });
}

function build_date_line_chart(chart_id, data) {
  d3.select('#' + chart_id + ' svg').select('.nvd3').remove();
  nv.addGraph(function() {
    var chart = nv.models.lineChart().useInteractiveGuideline(true);

    chart.xAxis
      .showMaxMin(false)
      .tickFormat(function(d) { return d3.time.format('%x')(new Date(d)); });

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
    var w = window.location.replace('/oauth');
});

$(document).ready(function(){
  $.getJSON('/token', function(data){
    if (data['access_token']) {
      if (data['access_token'] != 'unavailable') {
        $.cookie('token', data['access_token']);
        $("#authorize_button").remove();
        $("#reportrange_container").css('display', 'block');
      }
      else {
        alert("There was some problem retrieving your access token, please try it again later.");
        $("#authorize_container").css('display', 'block');
      }
    }
    else {
      $("#authorize_container").css('display', 'block');
    }
  });
});
