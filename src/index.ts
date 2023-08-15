#!/usr/bin/env node

import path, { resolve } from 'path'
import config from '~root/config.json';
import { main } from './bqxs';
import { scheduler, JobReturn } from '~src/components/util';

config.bqxs.saveDir = path.resolve(__dirname, '../../', config.bqxs.saveDir);

// main(config);


const getTask = function*() {
  const taskCounts = 20;
  for(let i = 0; i < taskCounts; i++) {
    // do something
    yield {
      key: i,
      job: new Promise<JobReturn>((resolve, reject) => setTimeout(() => {
        if(Math.random() > 0.8) {
          reject('err');
        } else {
          resolve({ msg: `key-${i}` });
        }
      }, (Math.random() + 0.5) * 1000)),
    };
  }
  return;
};

const test = async () => {
  const task = getTask();
  const res = await scheduler(task, 4);
  console.log(res);
};
test();