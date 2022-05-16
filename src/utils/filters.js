/* eslint-disable */
import Vue from 'vue'
import dayjs from 'dayjs'
Vue.filter('date', val => {
  if (val && (typeof val === 'number' || typeof val === 'object')) {
    return dayjs(val).format('YYYY-MM-DD')
  } else {
    return val || ''
  }
})

