'use strict';
// Fixed-width iframe for visual review. No device or outdoor test is implied.
const reviewFrame=document.getElementById('review-frame');
document.getElementById('review-width').addEventListener('change',event=>{reviewFrame.width=event.target.value;});
document.getElementById('review-screen').addEventListener('change',event=>{reviewFrame.src=`crew.html#${event.target.value}`;});
