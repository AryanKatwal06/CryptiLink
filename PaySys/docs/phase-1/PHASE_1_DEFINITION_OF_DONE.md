# PaySys - Phase 1 Definition of Done

Phase 1 is complete only when all of the following are true.

## Founder Actions
- [ ] All required external service accounts created
- [ ] google-services.json exists in android/app/
- [ ] Firebase phone auth enabled and test numbers configured
- [ ] Razorpay confirmed in TEST MODE with rzp_test_ key
- [ ] Release keystore generated and placed
- [ ] All service values added to .env

## AI Deliverables
- [ ] react-native-config installed and configured
- [ ] Typed env bootstrap created
- [ ] Service registry and env reference docs written
- [ ] Env files added for development, staging, and production
- [ ] .gitignore entries verified for env files
- [ ] Mobile runtime config no longer depends on Expo extras

## Validation Gate
- [ ] npm run validate:services is defined
- [ ] Service validation scripts exist
- [ ] No service config is hardcoded in source files

## React Native CLI Compliance
- [ ] No Expo packages installed for the mobile app
- [ ] No Expo Go or EAS workflow dependency
- [ ] Native build configuration remains CLI-compatible

## Security
- [ ] .env remains ignored
- [ ] .env.example remains committed
- [ ] No real secrets in source control
- [ ] Razorpay keys remain test-only during this phase

## Deferred Until GitHub Push
- [ ] Render provisioning and API base URL wiring
