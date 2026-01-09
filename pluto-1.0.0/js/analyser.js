/* global Chart */

'use strict';

(function () {
  Chart.plugins.register({
    id: 'samples-filler-analyser',

    beforeInit(chart, options) {
      this.element = document.getElementById(options.target);
    },

    afterUpdate(chart) {
      const { datasets } = chart.data;
      const { element } = this;
      const stats = [];
      let meta; let i; let ilen; let
        dataset;

      if (!element) {
        return;
      }

      for (i = 0, ilen = datasets.length; i < ilen; ++i) {
        meta = chart.getDatasetMeta(i).$filler;
        if (meta) {
          dataset = datasets[i];
          stats.push({
            fill: dataset.fill,
            target: meta.fill,
            visible: meta.visible,
            index: i,
          });
        }
      }

      this.element.innerHTML = '<table>'
				+ '<tr>'
					+ '<th>Dataset</th>'
					+ '<th>Fill</th>'
					+ '<th>Target (visibility)</th>'
				+ `</tr>${
				  stats.map((stat) => {
				    let { target } = stat;
				    let row =						`<td><b>${stat.index}</b></td>`
						+ `<td>${JSON.stringify(stat.fill)}</td>`;

				    if (target === false) {
				      target = 'none';
				    } else if (isFinite(target)) {
				      target = `dataset ${target}`;
				    } else {
				      target = `boundary "${target}"`;
				    }

				    if (stat.visible) {
				      row += `<td>${target}</td>`;
				    } else {
				      row += '<td>(hidden)</td>';
				    }

				    return `<tr>${row}</tr>`;
				  }).join('')}</table>`;
    },
  });
}());
