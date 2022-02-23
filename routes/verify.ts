/*
 * Copyright (c) 2014-2022 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

import models = require('../models/index')
import { Request, Response, NextFunction } from 'express'
import { Product } from '../data/types'

const utils = require('../lib/utils')
const security = require('../lib/insecurity')
const jwt = require('jsonwebtoken')
const jws = require('jws')
const cache = require('../data/datacache')
const Op = models.Sequelize.Op
const challenges = cache.challenges
const products = cache.products
const config = require('config')

exports.forgedFeedbackChallenge = () => (req: Request, res: Response, next: NextFunction) => {
  utils.solveIf(challenges.forgedFeedbackChallenge, () => {
    const user = security.authenticatedUsers.from(req)
    const userId = user?.data ? user.data.id : undefined
    return req.body?.UserId && req.body.UserId != userId // eslint-disable-line eqeqeq
  })
  next()
}

exports.captchaBypassChallenge = () => (req: Request, res: Response, next: NextFunction) => {
  if (utils.notSolved(challenges.captchaBypassChallenge)) {
    if (req.app.locals.captchaReqId >= 10) {
      if ((new Date().getTime() - req.app.locals.captchaBypassReqTimes[req.app.locals.captchaReqId - 10]) <= 10000) {
        utils.solve(challenges.captchaBypassChallenge)
      }
    }
    req.app.locals.captchaBypassReqTimes[req.app.locals.captchaReqId - 1] = new Date().getTime()
    req.app.locals.captchaReqId++
  }
  next()
}

exports.registerAdminChallenge = () => (req: Request, res: Response, next: NextFunction) => {
  utils.solveIf(challenges.registerAdminChallenge, () => { return req.body && req.body.role === security.roles.admin })
  next()
}

exports.passwordRepeatChallenge = () => (req: Request, res: Response, next: NextFunction) => {
  utils.solveIf(challenges.passwordRepeatChallenge, () => { return req.body && req.body.passwordRepeat !== req.body.password })
  next()
}

exports.accessControlChallenges = () => ({ url }: Request, res: Response, next: NextFunction) => {
  utils.solveIf(challenges.scoreBoardChallenge, () => { return utils.endsWith(url, '/1px.png') })
  utils.solveIf(challenges.adminSectionChallenge, () => { return utils.endsWith(url, '/19px.png') })
  utils.solveIf(challenges.tokenSaleChallenge, () => { return utils.endsWith(url, '/56px.png') })
  utils.solveIf(challenges.privacyPolicyChallenge, () => { return utils.endsWith(url, '/81px.png') })
  utils.solveIf(challenges.extraLanguageChallenge, () => { return utils.endsWith(url, '/tlh_AA.json') })
  utils.solveIf(challenges.retrieveBlueprintChallenge, () => { return utils.endsWith(url, cache.retrieveBlueprintChallengeFile) })
  utils.solveIf(challenges.securityPolicyChallenge, () => { return utils.endsWith(url, '/security.txt') })
  utils.solveIf(challenges.missingEncodingChallenge, () => { return utils.endsWith(url.toLowerCase(), '%f0%9f%98%bc-%23zatschi-%23whoneedsfourlegs-1572600969477.jpg') })
  utils.solveIf(challenges.accessLogDisclosureChallenge, () => { return url.match(/access\.log(0-9-)*/) })
  next()
}

exports.errorHandlingChallenge = () => (err, req: Request, { statusCode }: Response, next: NextFunction) => {
  utils.solveIf(challenges.errorHandlingChallenge, () => { return err && (statusCode === 200 || statusCode > 401) })
  next(err)
}

exports.jwtChallenges = () => (req: Request, res: Response, next: NextFunction) => {
  if (utils.notSolved(challenges.jwtUnsignedChallenge)) {
    jwtChallenge(challenges.jwtUnsignedChallenge, req, 'none', /jwtn3d@/)
  }
  if (!utils.disableOnWindowsEnv() && utils.notSolved(challenges.jwtForgedChallenge)) {
    jwtChallenge(challenges.jwtForgedChallenge, req, 'HS256', /rsa_lord@/)
  }
  next()
}

exports.serverSideChallenges = () => (req: Request, res: Response, next: NextFunction) => {
  if (req.query.key === 'tRy_H4rd3r_n0thIng_iS_Imp0ssibl3') {
    if (utils.notSolved(challenges.sstiChallenge) && req.app.locals.abused_ssti_bug === true) {
      utils.solve(challenges.sstiChallenge)
      res.status(204).send()
      return
    }

    if (utils.notSolved(challenges.ssrfChallenge) && req.app.locals.abused_ssrf_bug === true) {
      utils.solve(challenges.ssrfChallenge)
      res.status(204).send()
      return
    }
  }
  next()
}

function jwtChallenge (challenge, req: Request, algorithm: string, email: string) {
  const token = utils.jwtFrom(req)
  if (token) {
    const decoded = jws.decode(token) ? jwt.decode(token) : null
    jwt.verify(token, security.publicKey, (err, verified) => {
      if (err === null) {
        utils.solveIf(challenge, () => { return hasAlgorithm(token, algorithm) && hasEmail(decoded, email) })
      }
    })
  }
}

function hasAlgorithm (token, algorithm: string) {
  const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString())
  return token && header && header.alg === algorithm
}

function hasEmail (token, email: string) {
  return token?.data?.email?.match(email)
}

exports.databaseRelatedChallenges = () => (req: Request, res: Response, next: NextFunction) => {
  if (utils.notSolved(challenges.changeProductChallenge) && products.osaft) {
    changeProductChallenge(products.osaft)
  }
  if (utils.notSolved(challenges.feedbackChallenge)) {
    feedbackChallenge()
  }
  if (utils.notSolved(challenges.knownVulnerableComponentChallenge)) {
    knownVulnerableComponentChallenge()
  }
  if (utils.notSolved(challenges.weirdCryptoChallenge)) {
    weirdCryptoChallenge()
  }
  if (utils.notSolved(challenges.typosquattingNpmChallenge)) {
    typosquattingNpmChallenge()
  }
  if (utils.notSolved(challenges.typosquattingAngularChallenge)) {
    typosquattingAngularChallenge()
  }
  if (utils.notSolved(challenges.hiddenImageChallenge)) {
    hiddenImageChallenge()
  }
  if (utils.notSolved(challenges.supplyChainAttackChallenge)) {
    supplyChainAttackChallenge()
  }
  if (utils.notSolved(challenges.dlpPastebinDataLeakChallenge)) {
    dlpPastebinDataLeakChallenge()
  }
  next()
}

function changeProductChallenge (osaft) {
  let urlForProductTamperingChallenge: string | null = null
  osaft.reload().then(() => {
    for (const product of config.products) {
      if (product.urlForProductTamperingChallenge !== undefined) {
        urlForProductTamperingChallenge = product.urlForProductTamperingChallenge
        break
      }
    }
    if (urlForProductTamperingChallenge) {
      if (!utils.contains(osaft.description, `${urlForProductTamperingChallenge}`)) {
        if (utils.contains(osaft.description, `<a href="${config.get('challenges.overwriteUrlForProductTamperingChallenge')}" target="_blank">More...</a>`)) {
          utils.solve(challenges.changeProductChallenge)
        }
      }
    }
  })
}

function feedbackChallenge () {
  models.Feedback.findAndCountAll({ where: { rating: 5 } }).then(({ count }: { count: number }) => {
    if (count === 0) {
      utils.solve(challenges.feedbackChallenge)
    }
  })
}

function knownVulnerableComponentChallenge () {
  models.Feedback.findAndCountAll({
    where: {
      comment: {
        [Op.or]: knownVulnerableComponents()
      }
    }
  }).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.knownVulnerableComponentChallenge)
    }
  })
  models.Complaint.findAndCountAll({
    where: {
      message: {
        [Op.or]: knownVulnerableComponents()
      }
    }
  }).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.knownVulnerableComponentChallenge)
    }
  })
}

function knownVulnerableComponents () {
  return [
    {
      [Op.and]: [
        { [Op.like]: '%sanitize-html%' },
        { [Op.like]: '%1.4.2%' }
      ]
    },
    {
      [Op.and]: [
        { [Op.like]: '%express-jwt%' },
        { [Op.like]: '%0.1.3%' }
      ]
    }
  ]
}

function weirdCryptoChallenge () {
  models.Feedback.findAndCountAll({
    where: {
      comment: {
        [Op.or]: weirdCryptos()
      }
    }
  }).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.weirdCryptoChallenge)
    }
  })
  models.Complaint.findAndCountAll({
    where: {
      message: {
        [Op.or]: weirdCryptos()
      }
    }
  }).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.weirdCryptoChallenge)
    }
  })
}

function weirdCryptos () {
  return [
    { [Op.like]: '%z85%' },
    { [Op.like]: '%base85%' },
    { [Op.like]: '%hashids%' },
    { [Op.like]: '%md5%' },
    { [Op.like]: '%base64%' }
  ]
}

function typosquattingNpmChallenge () {
  models.Feedback.findAndCountAll({ where: { comment: { [Op.like]: '%epilogue-js%' } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.typosquattingNpmChallenge)
    }
  })
  models.Complaint.findAndCountAll({ where: { message: { [Op.like]: '%epilogue-js%' } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.typosquattingNpmChallenge)
    }
  })
}

function typosquattingAngularChallenge () {
  models.Feedback.findAndCountAll({ where: { comment: { [Op.like]: '%anuglar2-qrcode%' } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.typosquattingAngularChallenge)
    }
  })
  models.Complaint.findAndCountAll({ where: { message: { [Op.like]: '%anuglar2-qrcode%' } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.typosquattingAngularChallenge)
    }
  })
}

function hiddenImageChallenge () {
  models.Feedback.findAndCountAll({ where: { comment: { [Op.like]: '%pickle rick%' } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.hiddenImageChallenge)
    }
  })
  models.Complaint.findAndCountAll({ where: { message: { [Op.like]: '%pickle rick%' } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.hiddenImageChallenge)
    }
  })
}

function supplyChainAttackChallenge () {
  models.Feedback.findAndCountAll({ where: { comment: { [Op.or]: eslintScopeVulnIds() } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.supplyChainAttackChallenge)
    }
  })
  models.Complaint.findAndCountAll({ where: { message: { [Op.or]: eslintScopeVulnIds() } } }
  ).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.supplyChainAttackChallenge)
    }
  })
}

function eslintScopeVulnIds () {
  return [
    { [Op.like]: '%eslint-scope/issues/39%' },
    { [Op.like]: '%npm:eslint-scope:20180712%' }
  ]
}

function dlpPastebinDataLeakChallenge () {
  models.Feedback.findAndCountAll({
    where: {
      comment: { [Op.and]: dangerousIngredients() }
    }
  }).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.dlpPastebinDataLeakChallenge)
    }
  })
  models.Complaint.findAndCountAll({
    where: {
      message: { [Op.and]: dangerousIngredients() }
    }
  }).then(({ count }: { count: number }) => {
    if (count > 0) {
      utils.solve(challenges.dlpPastebinDataLeakChallenge)
    }
  })
}

function dangerousIngredients () {
  const ingredients: Array<{ [op: symbol]: string }> = []
  const dangerousProduct = config.get('products').filter((product: Product) => product.keywordsForPastebinDataLeakChallenge)[0]
  dangerousProduct.keywordsForPastebinDataLeakChallenge.forEach((keyword: string) => {
    ingredients.push({ [Op.like]: `%${keyword}%` })
  })
  return ingredients
}
