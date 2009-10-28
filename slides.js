/* slides.js, version 0.2
 * October 28, 2009 Jon Suderman
 *--------------------------------------------------------------------------*/
var Slides = Class.create({
  container     : null,
  slides        : null,
  options       : {},
  current_slide : null,
  looping       : true,
  animating     : false,
  has_thumbs    :false,
  
  initialize: function(){
    // Ensure we're not in surf-to-edit
    if ($('nterchange')) { return false }
            
    // Get arguments container and options (both optional, one required)
    var arg_container = arg_options = ''
    $A(arguments).each(function(arg){
      switch(typeof arg){
        case "string": arg_container=arg; break;
        case "object": arg_options=arg; break;
      }
    })

    // Override default options
    this.options = Object.extend({      
      container           : '',                                   // eg: #masthead
      slides_container    : 'ul.slides',
      thumbs_container    : 'ul.thumbs',
      thumb_active        : 'opacity:0.5',
      thumb_hover         : 'opacity:0.7',
      thumb_inactive      : 'opacity:1.0',
      thumb_morph_options : { duration: 0.6 },
      before_transition   : function(current_slide,next_slide){}, // Override with custom function
      after_transition    : function(current_slide,next_slide){}, // Override with custom function
      delay               : 8000                                  // Speed of slideshow
    }, arg_options || {})
    
    // If the container was specifically set
    this.options.container = (arg_container) ? arg_container : this.options.container

    if ((!this.options.container) && (!this.options.slides_container)) {
      throw("slides.js requires selector for #container or for #slides_container")
      return false
    }

    // Also sets this.slides
    if (this.prepare_slides_and_thumbs()) {

    // Start the slide show
    setTimeout(this.loop.bind(this),this.options.delay)
    }

  },


  // Hide all but the first slide
  prepare_slides_and_thumbs: function() {

    // Get the slides
    this.slides = $$(this.options.container +' '+ this.options.slides_container +' li')
    if(!this.slides.length) { 
      throw("slides.js #slides_container has no slides")
      return false
    } 
    
    // Get the container
    if (this.options.container) {
      this.container = $$(this.options.container).first()
    } else {
      this.container =this.slides.first().up('ul').up()
    }
    if (!this.container) {
      throw("slides.js requires a valid container")
      return false
    }

    // Don't build a slideshow if there's less than 2 slides
    if (this.slides.length < 2) { 
      return false 
    }

    // // Force the max-height as the actual height so the slide container doesn't collapse
    // var max_height = $$("#venue_gallery .mask").first().getStyle('max-height')
    // if (max_height) {
    //      $$("#venue_gallery .mask, #venue_gallery ul.slides").invoke('setStyle',{height:max_height})
    //    }

    // Get thumbs ul and unhide it (it's only useful with JS)
    var thumbs_ul = $$(this.options.container +' '+ this.options.thumbs_container).first()
    
    this.has_thumbs = (thumbs_ul) ? true:false
    var has_thumbs = this.has_thumbs    
    
    if (has_thumbs){ 
      thumbs_ul.setStyle({display:'block'}) 
    }

    this.slides.each(function(slide, index){
      slide.item_index = index
      slide.id = 'slide_' + index

      if (has_thumbs) {
        // Insert new thumb based off slide
        var thumb = '<li id="thumb_#{index}" venue_index="#{index}"><a href="#{img_src}"><img src="#{img_src}" height="80" /></a></li>'.interpolate({
          index:index, 
          img_src:slide.down('img').src 
        })
        thumbs_ul.insert(thumb)

        // Get thumb
        slide.thumb = thumbs_ul.select("li").last()
      }

      // Also, all slides should be absolute (this isn't done in the css because initial page loads looks nicer this way)
      slide.setStyle({position:'absolute'})
  
      // First Slide
      if (!slide.previous()) {
        // Set current slide to this one
        this.current_slide = slide
        if (has_thumbs){
          // Set its thumb active
          slide.thumb.addClassName('active')
          slide.thumb.down('img').morph(this.options.thumb_active, this.options.thumb_morph_options)
        }
  
      // Not first slide
      } else {
        // Hide all these slides since they're not the first
        slide.setStyle({ display:'none' })
      }
  
      // Last slide
      if (!slide.next()) {
        // Set next slide to the first one (so it wraps around)
        slide.next_slide = slide.up().firstDescendant()

      // Not last slide
      } else {
        // Set the next slide for the slideshow
        slide.next_slide = slide.next()
      }
  
      if (has_thumbs){
        // Observe the click of each thumb
        slide.thumb.down('a').observe('click', function(e){
          e.stop()
          // Turn off the slideshow loop
          this.looping = false
          // Activate the chosen slide
          this.activate(slide)
        }.bind(this))

        // Observe the mouseover of each thumb
        slide.thumb.down('a').observe('mouseover', function(e){
          if (this.animating) { return false }
          if (slide.thumb.hasClassName('active')) { return false }
          slide.thumb.down('img').morph(this.options.thumb_hover, this.options.thumb_morph_options) 
        }.bind(this))

        slide.thumb.down('a').observe('mouseout',  function(e){
          if (this.animating) { return false }
          if (slide.thumb.hasClassName('active')) { return false }
          slide.thumb.down('img').morph(this.options.thumb_hover, this.options.thumb_morph_options)
        }.bind(this))
      }

    }.bind(this))

    return true
  },


  activate: function(next_slide) {
    var has_thumbs = this.has_thumbs 

    // Ensure a different slide was chosen
    if (this.current_slide.id == next_slide.id) { return false }

    // Don't start a new animation if there is currently one happening
    if (this.animating) { return false }
    this.animating = true

    // Hook before slide transition
    this.options.before_transition(this.current_slide,this.current_slide.next_slide)

    // Fade out the current slide and deactivate its thumb
    if (has_thumbs){
      this.current_slide.thumb.removeClassName('active')
      this.current_slide.thumb.down('img').morph(this.options.thumb_inactive, this.options.thumb_morph_options)
    }
    Effect.Fade(this.current_slide)

    // Appear the new slide and activate its thumb
    if (has_thumbs){
      next_slide.thumb.addClassName('active')
      next_slide.thumb.down('img').morph(this.options.thumb_active, this.options.thumb_morph_options)
    }
    Effect.Appear(next_slide, { afterFinish:function(){                
      this.animating = false
      
      // Hook after slide transition
      this.options.after_transition(this.current_slide,this.current_slide.next_slide)
    }.bind(this)})

    // Update what the current slide is
    this.current_slide = next_slide
  },

  loop: function() {
    var has_thumbs = this.has_thumbs 
    
    // If looping is turned off, get out of here
    if (!this.looping) { return false }
    this.animating = true

    // Hook before slide transition
    this.options.before_transition(this.current_slide,this.current_slide.next_slide)

    // Fade out the current slide and deactivate its thumb
    if (has_thumbs){
      this.current_slide.thumb.removeClassName('active')
      this.current_slide.thumb.down('img').morph(this.options.thumb_inactive, this.options.thumb_morph_options)
    }
    Effect.Fade(this.current_slide)

    // Appear the new slide and activate its thumb
    if (has_thumbs){
      this.current_slide.next_slide.thumb.addClassName('active')
      this.current_slide.next_slide.thumb.down('img').morph(this.options.thumb_active, this.options.thumb_morph_options)
    }
    Effect.Appear(this.current_slide.next_slide, { afterFinish:function(){
      this.animating = false
      
      // Hook after slide transition
      this.options.after_transition(this.current_slide,this.current_slide.next_slide)
    }.bind(this)})

    // Update what the current slide is
    this.current_slide = this.current_slide.next_slide

    // Do it all again
    setTimeout(this.loop.bind(this),this.options.delay)
  }

})