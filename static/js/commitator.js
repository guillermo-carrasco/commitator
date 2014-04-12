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
  var get_commits_uri = '/api/org/commits?org=' + org;
  if (since && until) {
    get_commits_uri += '&since=' + since + '&until=' + until;
  }
  $.getJSON(get_commits_uri, function(data) {
    //Prepare the data for the nvd3 plot
    chart_data = {'key': 'Total commits per repository', 'values': []};
    $.each(data, function(k, v) {
      //Omit repositories without commits
      if (v) {
        var value = {};
        value['label'] = k;
        value['value'] = v;
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

    update_global_commits_per_repo(since, until, org);
    $("#total_commits_chart").prepend("<h2>Total number of commits per repository</h2>")
  }
  else {
    $("#org_field_div").addClass("has-error");
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
    .tooltips(true)
    .showValues(true)
    .height(600)
    .margin({bottom: 60});

    d3.select('#' + chart_id + ' svg')
    .datum(data)
    .transition().duration(1000)
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
      'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
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
});