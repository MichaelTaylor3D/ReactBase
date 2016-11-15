import React from 'react';
import ReactDOM from 'react-dom';
import App from './main-view/index';
import * as polyfill from 'babel-polyfill';

if (document.getElementById('app-container')) {
	console.log('!');
	ReactDOM.render(
		<App />,
		document.getElementById('app-container')
	);
}
