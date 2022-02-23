/*
 * Copyright (c) 2014-2022 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import models = require('../models/index')
import { Request, Response, NextFunction } from 'express'

const utils = require('../lib/utils')
const security = require('../lib/insecurity')
const cache = require('../data/datacache')
const challenges = cache.challenges

module.exports = function saveLoginIp () {
  return (req: Request, res: Response, next: NextFunction) => {
    const loggedInUser = security.authenticatedUsers.from(req)
    if (loggedInUser !== undefined) {
      let lastLoginIp = req.headers['true-client-ip']
      if (!utils.disableOnContainerEnv()) {
        utils.solveIf(challenges.httpHeaderXssChallenge, () => { return lastLoginIp === '<iframe src="javascript:alert(`xss`)">' })
      } else {
        lastLoginIp = security.sanitizeSecure(lastLoginIp)
      }
      if (lastLoginIp === undefined) {
        lastLoginIp = utils.toSimpleIpAddress(req.connection.remoteAddress)
      }
      models.User.findByPk(loggedInUser.data.id).then(user => {
        user.update({ lastLoginIp: lastLoginIp }).then(user => {
          res.json(user)
        }).catch((error: Error) => {
          next(error)
        })
      }).catch((error: Error) => {
        next(error)
      })
    } else {
      res.sendStatus(401)
    }
  }
}
