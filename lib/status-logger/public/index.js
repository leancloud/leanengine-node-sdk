'use strict';

$.get('initial.json', function(data) {
  $('#routerSuccessAndError').highcharts({
    title: {
      text: '路由 成功／失败'
    },
    yAxis: {
      title: {
        text: '次数'
      }
    },
    series: data.routerSuccessAndError
  });

  $('#responseTime').highcharts({
      chart: {
        type: 'area'
      },
      title: {
        text: '平均响应时间'
      },
      yAxis: {
        title: {
          text: '时间（毫秒）'
        }
      },
      series: data.responseTime
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
});
