import { initializeContext, initializeContextWithoutWallet } from '@optifi/optifi-sdk'
import { getAllUsersOnExchange } from '@optifi/optifi-sdk/lib/utils/accounts.js'
import { SWITCHBOARD } from '@optifi/optifi-sdk/lib/constants.js'
import { loadOrdersAccountsForOwnerV2, loadOrdersForOwnerOnAllMarkets } from '@optifi/optifi-sdk/lib/utils/orders.js'
import { parseAggregatorAccountData } from '@switchboard-xyz/switchboard-api'
import { PublicKey } from '@solana/web3.js'
import { findOptifiMarketsWithFullData, getUserPositions } from '@optifi/optifi-sdk/lib/utils/market.js'
// import fetch from 'node-fetch'
import { getAllOrdersForAccount } from '@optifi/optifi-sdk/lib/utils/orderHistory.js'
import fetch from 'node-fetch'

// exports.store = 
(async () => {
    let context = await initializeContextWithoutWallet(undefined, "111313")
    let allUser = await getAllUsersOnExchange(context)
    allUser = allUser.slice(0, 2)

    console.log(allUser)

    try {
        let spotResBtc = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_BTC_USD))
        let spotResEth = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_ETH_USD))
        let usdcSpot = await parseAggregatorAccountData(context.connection, new PublicKey(SWITCHBOARD[context.endpoint].SWITCHBOARD_USDC_USD))

        let spotBtc = (spotResBtc.lastRoundResult === null || spotResBtc.lastRoundResult === void 0 ? void 0 : spotResBtc.lastRoundResult.result) / usdcSpot.lastRoundResult === null || usdcSpot.lastRoundResult === void 0 ? void 0 : usdcSpot.lastRoundResult.result
        let spotEth = (spotResEth.lastRoundResult === null || spotResEth.lastRoundResult === void 0 ? void 0 : spotResEth.lastRoundResult.result) / usdcSpot.lastRoundResult === null || usdcSpot.lastRoundResult === void 0 ? void 0 : usdcSpot.lastRoundResult.result

        let optifiMarkets = await findOptifiMarketsWithFullData(context)

        console.log(optifiMarkets)

        let allData = allUser.map(async (user) => {

            const tokenAmount = await context.connection.getTokenAccountBalance(user.accountInfo.userMarginAccountUsdc)
            const usdcAccountValue = tokenAmount.value.uiAmount || 0

            const positions = await getUserPositions(context, user.publicKey)

            const totalNetOptionValue = []

            positions.map(position => {
                position.marketId = position.marketId.toString()
                switch (position.asset) {
                    case 'BTC':
                        totalNetOptionValue.push((spotBtc - position.strike) * position.netPosition)
                        break
                    case 'ETH':
                        totalNetOptionValue.push((spotEth - position.strike) * position.netPosition)
                        break
                }
            })

            const totalMarginRequirement = user.accountInfo.amountToReserve
            let totalMarginRequirementValue = 0.0
            for (let i = 0; i < totalMarginRequirement.length; i++) {
                totalMarginRequirementValue += totalMarginRequirement[i].toNumber()
            }

            const liquidationStatus = user.accountInfo.isInLiquidation

            let openOrdersAccount = await loadOrdersAccountsForOwnerV2(context, optifiMarkets, user.publicKey)

            let context2 = await initializeContextWithoutWallet(undefined, "111313", undefined, { disableRetryOnRateLimit: true, commitment: 'confirmed' })
            let orderHistory = await getAllOrdersForAccount(context2, user.publicKey)

            let orders = await loadOrdersForOwnerOnAllMarkets(optifiMarkets, openOrdersAccount.map(e => e.openOrdersAccount), orderHistory)

            let orderbookLocked = []
            openOrdersAccount.map(e => {
                orderbookLocked.push([
                    e.openOrdersAccount.baseTokenFree.toNumber(),
                    e.openOrdersAccount.baseTokenTotal.toNumber(),
                    e.openOrdersAccount.quoteTokenFree.toNumber(),
                    e.openOrdersAccount.quoteTokenTotal.toNumber(),
                ])
            })

            const historyData = {
                userAccountAddress: user.publicKey.toString(),
                usdcAccountValue,
                positions,
                totalNetOptionValue,
                totalMarginRequirement: totalMarginRequirementValue,
                liquidationStatus,
                openOrders: orders,
                orderbookLocked
            }
            const userData = {
                userAccountAddress: user.publicKey.toString(),
                userMarginAccountUsdc: user.accountInfo.userMarginAccountUsdc.toString(),
            }


            //     // here is where we make the api call
            // const updateUserRes = await fetch('https://188dqni0zk.execute-api.us-west-1.amazonaws.com/default/users', {
            //     method: 'post',
            //     body: JSON.stringify(userData),
            //     headers: { 'Content-Type': 'application/json' }
            // }).then(response => response.json())
            // console.log(updateUserRes)

            // const storeHistoryRes = await fetch('https://188dqni0zk.execute-api.us-west-1.amazonaws.com/default/history', {
            //     method: 'post',
            //     body: JSON.stringify(historyData),
            //     headers: { 'Content-Type': 'application/json' }
            // }).then(response => response.json())

            return { userData, historyData }
        })

        console.log(await Promise.all(allData))


        console.log(userList)
    } catch (error) {

    }

})()