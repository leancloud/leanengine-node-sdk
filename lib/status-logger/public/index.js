'use strict';

loadInitialData();

$(function() {
  $('#routerSelect').change(function() {
    loadInitialData({router: $('#routerSelect').val() || undefined});
    $('#routerStatusCodeSelect').val('')
  });

  $('#routerStatusCodeSelect').change(function() {
    loadInitialData({routerStatusCode: $('#routerStatusCodeSelect').val() || undefined});
    $('#routerSelect').val('')
  });
});

function loadInitialData(options) {
  $.get('initial.json', options, function(data) {
    if (options === undefined) {
      $('#routerSelect').html("<option></option>");
      data.routers.forEach(function(name) {
        $('#routerSelect').append($("<option></option>").attr("value", name).text(name));
      });
    }

    Highcharts.setOptions({
      global: {
        useUTC: false
      }
    });

    $('#routerSuccessAndError').highcharts({
      title: {
        text: '路由访问次数'
      },
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: {
          text: '次数'
        }
      },
      series: data.routerSuccessAndError
    });

    $('#cloudSuccessAndError').highcharts({
      title: {
        text: '云调用次数'
      },
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: {
          text: '次数'
        }
      },
      series: data.cloudSuccessAndError
    });

    $('#routerResponseTime').highcharts({
      chart: {
        type: 'area'
      },
      title: {
        text: '路由平均响应时间'
      },
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: {
          text: '时间（毫秒）'
        }
      },
      series: data.routerResponseTime
    });

    $('#cloudResponseTime').highcharts({
      chart: {
        type: 'area'
      },
      title: {
        text: '云调用平均响应时间'
      },
      xAxis: {
        type: 'datetime',
      },
      yAxis: {
        title: {
          text: '时间（毫秒）'
        }
      },
      series: data.cloudResponseTime
    });

    $('#routerPie').highcharts({
      chart: {
        type: 'pie'
      },
      title: {
        text: '路由分布'
      },
      series: data.routerPie
    });

    $('#statusPie').highcharts({
      chart: {
        type: 'pie'
      },
      title: {
        text: '响应代码分布'
      },
      series: data.statusPie
    });

    $('#cloudPie').highcharts({
      chart: {
        type: 'pie'
      },
      title: {
        text: '云调用分布'
      },
      series: data.cloudPie
    });

    $('#cloudStatusPie').highcharts({
      chart: {
        type: 'pie'
      },
      title: {
        text: '云调用响应分布'
      },
      series: data.cloudStatusPie
    });
  });
}
