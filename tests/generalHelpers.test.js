const { 
    checkIsSupportedChainByChainId,
    getSupportedChains,
    validateLenderTerms
} = require('../helpers/generalHelpers');

test('Should return chain is supported', async () => {
    try {
        const isChainSupportedCaseOne = await checkIsSupportedChainByChainId({rawChainId: "0x1"});
        const isChainSupportedCaseTwo = await checkIsSupportedChainByChainId({rawChainId: "1"});

        expect(isChainSupportedCaseOne).toBe(true);
        expect(isChainSupportedCaseTwo).toBe(true);

    } catch (error) {
        console.error(error, "error")
    }
});

test('Should return chain is not supported', async () => {
    try {
        const isChainSupportedCaseOne = await checkIsSupportedChainByChainId({rawChainId: "0x73799"});
        const isChainSupportedCaseTwo = await checkIsSupportedChainByChainId({rawChainId: "73799"});

        expect(isChainSupportedCaseOne).toBe(false);
        expect(isChainSupportedCaseTwo).toBe(false);

    } catch (error) {
        console.error(error, "error")
    }
});


test('Should return supported chain only', async () => {
    try {
        const chains = await getSupportedChains();
        expect(chains.length).toBeGreaterThan(0)
    } catch (error) {
        console.error(error, "error")
    }
});

test('Should validate the lender terms on set restrictions', async () => {
    //price success case: price > 0 
    const termsTestSampleOne = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }

    expect(await validateLenderTerms({terms: termsTestSampleOne})).toBeTruthy()

    //price errror case: price <= 0 
    const termsTestSampleTwo = {
        price: "0",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    };

    try {
        await validateLenderTerms({terms: termsTestSampleTwo})
    } catch(error) {
        expect(error.message).toBe("Price should be greater than zero")
    }

    //interest success case <= 20
    const termsTestSampleThree = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }

    expect(await validateLenderTerms({terms: termsTestSampleThree})).toBeTruthy()

    //interest error case >= 20
    const termsTestSampleFour = {
        price: "2",
        interest: "21",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }
    try {
        await validateLenderTerms({terms: termsTestSampleFour})
    } catch(error) {
        expect(error.message).toBe("Interest should be less than 20%")
    }
    //chain name success case supported chain
    const termsTestSampleFive = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }
    expect(await validateLenderTerms({terms: termsTestSampleFive})).toBeTruthy()

    //chain name error case unSupported chain
    const termsTestSampleSix = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Gnosis Chain"
    }
    try {
        await validateLenderTerms({terms: termsTestSampleSix})
    } catch(error) {
        expect(error.message).toBe("Chain Gnosis Chain not supported")
    }

    //currency chain Ethereum Mainnet success case
    const termsTestSampleSeven = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }
    expect(await validateLenderTerms({terms: termsTestSampleSeven})).toBeTruthy()

    //currency chain Ethereum Mainnet error  case
    const termsTestSampleEight = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "Matic",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }

    try {
        await validateLenderTerms({terms: termsTestSampleEight})
    } catch(error) {
        expect(error.message).toBe("Currency Matic not supported on Ethereum Mainnet")
    }

    //installment check  success case
    const termsTestSampleNine = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }

    expect(await validateLenderTerms({terms: termsTestSampleNine})).toBeTruthy()

    //installment check  error case
    const termsTestSampleTen = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "13",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }

    try {
        await validateLenderTerms({terms: termsTestSampleTen})
    } catch(error) {
        expect(error.message).toBe("Maximum Installments must be less than 12")
    }

    //Maximum Duration validation success case
    const termsTestSampleEleven = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Days",
        chainName: "Ethereum Mainnet"
    };

    expect(await validateLenderTerms({terms: termsTestSampleEleven})).toBeTruthy()

    //Maximum Duration validation error case
    const termsTestSampleTwelve = {
        price: "2",
        interest: "20",
        maxDuration: "31",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Days",
        chainName: "Ethereum Mainnet"
    }

    try {
        await validateLenderTerms({terms: termsTestSampleTwelve})
    } catch(error) {
        expect(error.message).toBe("Maximum 30 Days allowed or choose month for longer duration")
    }

    //Maximum Duration validation success case
    const termsTestSampleThirteen = {
        price: "2",
        interest: "20",
        maxDuration: "12",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }
    expect(await validateLenderTerms({terms: termsTestSampleThirteen})).toBeTruthy()

    //Maximum Duration validation error case
    const termsTestSampleFourteen = {
        price: "2",
        interest: "20",
        maxDuration: "13",
        maxInstallments: "12",
        currency: "ETH",
        durationType: "Months",
        chainName: "Ethereum Mainnet"
    }

    try {
        await validateLenderTerms({terms: termsTestSampleFourteen})
    } catch(error) {
        expect(error.message).toBe("Maximum 12 Months allowed")
    }

})