////////////////////////////////////
//  Fetching information methods  //
////////////////////////////////////

function get_org_repos(org) {
  $.getJSON(GH_ORG_REPOS.replace('{org}', org), function(data) {
    var chart_data = {};
    chart_data['key'] = "Total number of commits per repository";
    chart_data['values'] = [];
    //Iterate over all repositories
    $.each(data, function(_, repo){
      var value = {"label": repo['name']};
      // Get the length of the first pages of commits
      $.getJSON(repo['commits_url'].replace('{/sha}', ''), function(data) {
        value['value'] = data.length;
        chart_data['values'].push(value);
        build_discrete_bar_chart([chart_data]);
      });
    });
  });
}



///////////////////////////
//  Update info methods  //
///////////////////////////


function update_all(org) {
  update_global_commits_per_repo(org);
}


//Updates the chart representing commits by user (first page returned by GH API)
function update_global_commits_per_repo(org) {
  var repos = get_org_repos(org);
}



///////////////////////
//  Drawing methods  //
//////////////////////

function build_discrete_bar_chart(data) {
  nv.addGraph(function() {
    var chart = nv.models.discreteBarChart()
      .x(function(d) { return d.label })
      .y(function(d) { return d.value })
      .staggerLabels(true)
      .tooltips(true)
      .showValues(true)

    d3.select('#main_chart svg')
      .datum(data)
      .transition().duration(500)
      .call(chart)
      ;

    nv.utils.windowResize(chart.update);

    return chart;
  });
}


//////////////////////////
//  Responsive methods  //
//////////////////////////

$("#org_form").submit( function(e) {
  e.preventDefault();
  var org = document.getElementById('org_field').value;
  update_all(org);
});
