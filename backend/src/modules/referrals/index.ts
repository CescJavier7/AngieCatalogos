import { Module } from "@medusajs/framework/utils"
import ReferralsModuleService from "./service"

export const REFERRALS_MODULE = "referrals"

export default Module(REFERRALS_MODULE, {
  service: ReferralsModuleService,
})
