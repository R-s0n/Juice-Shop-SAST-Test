/*
 * Copyright (c) 2014-2022 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import path = require('path')
import { Request, Response, NextFunction } from 'express'

const utils = require('../lib/utils')

module.exports = function serveAngularClient () {
  return ({ url }: Request, res: Response, next: NextFunction) => {
    if (!utils.startsWith(url, '/api') && !utils.startsWith(url, '/rest')) {
      res.sendFile(path.resolve('frontend/dist/frontend/index.html'))
    } else {
      next(new Error('Unexpected path: ' + url))
    }
  }
}
