#!/usr/bin/env node

import path from 'path'
import config from '~root/config.json';
import { main } from './bqxs';

config.bqxs.saveDir = path.resolve(__dirname, '../../', config.bqxs.saveDir);

main(config);
