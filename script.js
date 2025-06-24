function Loading(){
    var tl=gsap.timeline()
    tl.to("#yellow",{
    top:"-100%",
    delay:0.5,
    duration:0.5,
    ease:"expo.out"
    })
    tl.from("#yellow1",{
        top:"100%",
    delay:0.5,
    duration:0.5,
    ease:"expo.out"
    },"anim")
    tl.to("#loader h1",{
    delay:0.8,
    delay:0.5,
    color:"black"
    },"anim")
    tl.to("#loader",{
    display:"none"
    })
    tl.to("#loader",{
    opacity:0
    })
}
Loading()
// const scroll = new LocomotiveScroll({
//     el: document.querySelector('#main'),
//     smooth: true
// });