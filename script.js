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
   tl.to("#loader h1", {
  delay: 0.5,
  color: "black"
}, "anim")

   tl.to("#loader", {
  opacity: 0,
  duration: 0.5,
  onComplete: () => {
    document.querySelector("#loader").style.display = "none";
  }
});

    tl.to("#loader",{
    opacity:0
    })
}
Loading()
const scroll = new LocomotiveScroll({
  el: document.querySelector('#main'),
  smooth: true
});
var elems=document.querySelectorAll(".elem");
var page2=document.querySelector("#page2")
elems.forEach(function(ele){
      ele.addEventListener("mouseenter",function(){
      var bgimg=ele.getAttribute("data-img")
      page2.style.backgroundImage=`url(${bgimg})`
      })
})