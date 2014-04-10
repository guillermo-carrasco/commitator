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

function get_org_repos(org) {
  myApp.showPleaseWait();
  $.getJSON('/api/org/commits?org=' + org, function(data) {
    //Prepare the data for the nvd3 plot
    chart_data = {'key': 'Total commits per repository', 'values': []};
    $.each(data, function(k, v) {
      var value = {};
      value['label'] = k;
      value['value'] = v;
      chart_data['values'].push(value);
    });
    build_discrete_bar_chart([chart_data]);
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
  myApp.hidePleaseWait();
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
