const PORT = process.env.PORT || 8000
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const app = express()

//list of array objects
const originalData = [
    {
        name: 'rasamalaysia',
        address: 'https://rasamalaysia.com/recipes/malaysian-recipes/',
        base: 'https://rasamalaysia.com'
    },
]

const data = []

const pages = []
const recipes = []
const specificPages = []
const specificRecipes = []


//scraping pages
originalData.forEach(obj => {
    axios.get(obj.address)
        .then(response => {
            const html = response.data
            const $ = cheerio.load(html)

            //recursive pagination
            $('a:contains("page")', html).each(function() {
                const pagination = $(this).attr('href')

                if(pagination.includes(obj.base)) {
                    data.push({
                        name: obj.name,
                        address: pagination,
                        base: obj.base
                    })
                }
                //selain rasamalaysia else if

            })
            
            //for pages
            data.forEach(el => {
                axios.get(el.address)
                    .then(res => {
                        const html = res.data
                        const $ = cheerio.load(html)

                        $('a.entry-title-link', html).each(function() {
                            const title = $(this).text()
                            const url = $(this).attr('href')
            
                            pages.push({
                                title,
                                url: url,
                                source: el.name
                            })
                        })
            
                        for(const i in pages) {
                            pages[i] = Object.assign({id: i}, pages[i])
                        }

                        console.log("done scraping...")
                    })
            })
            
        })
})
    

//routing
app.get('/', (req, res) => {
    res.json("Malaysian Recipes API")
})

// app.get('/pages', (req, res) => {
//     res.json(pages)
// })

app.get('/recipes', (req, res) => {

    pages.forEach(page => {
        axios.get(page.url)
            .then(response => {
                const html = response.data
                const $ = cheerio.load(html)
    
                //rasamalaysia page
                $('.mv-create-wrapper', html).each(function() {
                    const img = $(this).find('img').attr('data-src')
                    const size = $('.mv-create-yield').text()
                    const prepTime = $('.mv-create-time-prep .mv-time-part').text()
                    const cookTime = $('.mv-create-time-active .mv-time-part').text()
                    const totalTime = $('.mv-create-time-total .mv-time-part').text()

                    // const ingredients = $('.mv-create-ingredients ul li').text().replace(/\s\s+/g, ' ').split(" ")
                    // const ingredients = $('.mv-create-ingredients ul li').text().replace(/["]+/g, '').split(/\s\s+/g)
                    const ingredients = $('.mv-create-ingredients ul li').text().replace(/["]+/g, '"').split(/\s\s+/g) 

                    //to remove the first element of index
                    ingredients.shift()
                    //to remove the last element of index
                    ingredients.pop()

                    //remove noscript tags
                    $('noscript').remove()
                    const instructions = $('.mv-create-instructions ol li').text().replace(/["]+/g, '"').split(". ")

                    //remove last element of index if the value is null
                    if(instructions[instructions.length - 1] == "") {
                        instructions.pop()
                    }

                    recipes.push({
                        title: page.title,
                        url: page.url,
                        source: page.source,
                        img: img,
                        size: size,
                        prepTime: prepTime,
                        cookTime: cookTime,
                        totalTime: totalTime,
                        ingredients,
                        instructions
                    })

                    //remove and repair problem recipe
                    recipes.forEach((recipe, i) => {
                        const halalOnly = recipe.ingredients.join()
                        const checkingredients = recipe.ingredients
                        const checkTitle = recipe.title
                        const checkCookTime = recipe.cookTime
                        const checkTotalTime = recipe.totalTime

                        if(halalOnly.includes("pork")) {
                            recipes.splice(i, 1)
                        }

                        if(checkingredients.includes("1")) {
                            recipes.splice(i, 1)
                        }

                        if(checkTitle.includes("Kaya Toast")) {
                            recipes.splice(i, 1)
                        }

                        if(checkTitle.includes("Nasi Ulam")) {
                            recipes.splice(i, 1)
                        }

                        //repair time
                        if(checkCookTime.match(/hour\d/g)) {
                            const minute = recipe.cookTime.substr(6)
                            const hour = recipe.cookTime.substr(0, 6)
                            const newTime = hour + ' ' + minute
                            
                            recipe.cookTime = newTime
                        }

                        if(checkCookTime.match(/hours\d/g)) {
                            const minute = recipe.cookTime.substr(7)
                            const hours = recipe.cookTime.substr(0, 7)
                            const newTime = hours + ' ' + minute
                            
                            recipe.cookTime = newTime
                        }

                        if(checkTotalTime.match(/hour\d/g)) {
                            const minute = recipe.totalTime.substr(6)
                            const hour = recipe.totalTime.substr(0, 6)
                            const newTime = hour + ' ' + minute
                            
                            recipe.totalTime = newTime
                        }

                        if(checkTotalTime.match(/hours\d/g)) {
                            const minute = recipe.totalTime.substr(7)
                            const hours = recipe.totalTime.substr(0, 7)
                            const newTime = hours + ' ' + minute
                            
                            recipe.totalTime = newTime
                        }
                    })

                    
                })
                
            })

            //function to add id for each object
            for(const i in recipes) {
                recipes[i] = Object.assign({id: i}, recipes[i])
            }
    })

    res.json(recipes)
})

// app.get('/recipes/:pageId', (req, res) => {
//     const recipesId = req.params.pageId
//     console.log(recipesId)

//     res.json(specificPages)
// })

// app.get('/recipes/:recipeId', (req, res) => {
//     res.json(specificRecipes)
// })


app.listen(PORT, () => console.log(`Server running on PORT ${PORT}`))

//filter()  returns array with filtered function
//trim()   returns string with removed whitespace from both ends

// (in the future)
//remove porks recipes at pages array/routing
//add nutrition and radar graph