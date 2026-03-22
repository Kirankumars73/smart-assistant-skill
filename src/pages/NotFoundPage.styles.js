import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9999;

  .container {
    --clr-green: #12b886;
    --clr-green-dark: #0f976e;
    --clr-green-darker: #0b7153;
    --clr-green-darkest: #074c38;
    --linear-bounce: linear(0 0%,0 2.27%,0.02 4.53%,0.04 6.8%,0.06 9.07%,0.1 11.33%,0.14 13.6%,0.25 18.15%,0.39 22.7%,0.56 27.25%,0.77 31.8%,1 36.35%,0.89 40.9%,0.85 43.18%,0.81 45.45%,0.79 47.72%,0.77 50%,0.75 52.27%,0.75 54.55%,0.75 56.82%,0.77 59.1%,0.79 61.38%,0.81 63.65%,0.85 65.93%,0.89 68.2%,1 72.7%,0.97 74.98%,0.95 77.25%,0.94 79.53%,0.94 81.8%,0.94 84.08%,0.95 86.35%,0.97 88.63%,1 90.9%,0.99 93.18%,0.98 95.45%,0.99 97.73%,1 100%);
    --lad: 0.25s;
    --ladl: 0.05s;
    --mad: 0.5s;
    --mrt: 0.75s;
    --bld: 1s;
    --ald: 2s;
    --ltod: calc(calc(var(--ladl) * 117) + calc(var(--mrt) * 5) + calc(var(--mad) * 5) + var(--bld));
    --ghsd: calc(calc(var(--ladl) * 145) + calc(var(--mrt) * 6) + calc(var(--mad) * 6) + var(--ald));
    --last-dlt: calc(calc(var(--ladl) * 183) + calc(var(--mrt) * 6) + calc(var(--mad) * 6) + var(--ald));
    --last-dance: calc(var(--last-dlt) + calc(var(--ladl) * 25) + var(--mrt) + var(--ald));
    --end: calc(var(--last-dance) + var(--mad));
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    font-family: Verdana, Geneva, Tahoma, sans-serif;
    background-color: #000;
    --rotate-deg: 10deg;
    --rotate-degn: calc(var(--rotate-deg) * -1);
  }
  .container:has(.gr-1:hover) .not-found-message { transform: rotateX(var(--rotate-deg)) rotateY(var(--rotate-deg)); }
  .container:has(.gr-2:hover) .not-found-message { transform: rotateX(var(--rotate-deg)) rotateY(var(--rotate-degn)); }
  .container:has(.gr-3:hover) .not-found-message { transform: rotateX(var(--rotate-degn)) rotateY(var(--rotate-degn)); }
  .container:has(.gr-4:hover) .not-found-message { transform: rotateX(var(--rotate-degn)) rotateY(var(--rotate-deg)); }

  .grid {
    position: absolute;
    width: 50%;
    height: 50%;
    transform: translateZ(20px);
    z-index: 2;
  }
  .grid.gr-1 { top: 0; right: 0; }
  .grid.gr-2 { top: 0; left: 0; }
  .grid.gr-3 { bottom: 0; left: 0; }
  .grid.gr-4 { bottom: 0; right: 0; }

  .light {
    --light-w: 300px;
    --max-shadow-spread: 120px;
    position: absolute;
    bottom: 1rem;
    right: 50%;
    width: var(--light-w);
    height: 3px;
    border-radius: 3px;
    background-color: var(--clr-green);
    transform: translate(50%, 50%);
    box-shadow: 0 0 50px 1px var(--clr-green), 0 0 var(--max-shadow-spread) 20px var(--clr-green), 0 0 25px 5px var(--clr-green) inset;
    opacity: 0;
    animation: turn-on-light 10s infinite both, stay-off var(--ltod) backwards;
    animation-delay: var(--ltod), 0s;
    z-index: 1;
  }
  .light::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 100%);
    background-color: #000;
    width: 110%;
    height: 600%;
    z-index: 0;
  }
  .light .blocker {
    position: absolute;
    bottom: 0;
    background-color: #000;
    width: calc(var(--max-shadow-spread) + 50px);
    height: 14rem;
    z-index: -5;
  }
  .light .blocker:nth-child(1) {
    clip-path: polygon(0 0, 0 100%, 100% 100%, 100% calc(100% - 1rem - 3px), 0 0);
    left: 0;
    transform: translate(-100%, calc(3px + 1rem));
  }
  .light .blocker:nth-child(2) {
    clip-path: polygon(100% 0, 100% 100%, 0 100%, 0 calc(100% - 1rem - 3px), 100% 0);
    right: 0;
    transform: translate(100%, calc(3px + 1rem));
  }

  .messages {
    position: relative;
    width: 100%;
    perspective: 1200px;
    transform-style: preserve-3d;
    z-index: 3;
  }

  .message {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    max-width: 95%;
    margin-inline: auto;
    color: white;
    font-size: 2rem;
    font-weight: 900;
    text-align: center;
    word-break: keep-all;
    overflow-wrap: break-word;
    transform: translate(-50%, -50%);
    text-shadow: 0px 0px 10px var(--clr-green);
    animation: sentence-go var(--mad) ease-in forwards;
  }
  .message .word { display: inline-block; margin-right: 0.4em; }
  .message .letter {
    display: inline-block;
    transform: translate(-1px, 5px);
    filter: blur(5px);
    opacity: 0;
    animation: letter-come var(--lad) ease-in forwards;
  }

  @keyframes letter-come { to { transform: translate(0,0); filter: blur(0); opacity: 1; } }
  @keyframes sentence-go { to { transform: translate(calc(-50% + 25px), -50%); filter: blur(15px); opacity: 0; } }

  .m1 { animation-delay: calc(calc(var(--ladl)*10) + var(--mrt)); }
  .m1 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--ladl)*1); }
  .m1 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--ladl)*2); }
  .m1 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--ladl)*3); }
  .m1 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--ladl)*4); }
  .m1 .word:nth-child(2) .letter:nth-of-type(3) { animation-delay: calc(var(--ladl)*5); }
  .m1 .word:nth-child(2) .letter:nth-of-type(4) { animation-delay: calc(var(--ladl)*6); }
  .m1 .word:nth-child(2) .letter:nth-of-type(5) { animation-delay: calc(var(--ladl)*7); }
  .m1 .word:nth-child(2) .letter:nth-of-type(6) { animation-delay: calc(var(--ladl)*8); }

  .m2 { --dlt: calc(calc(var(--ladl)*10) + var(--mrt) + var(--mad)); animation-delay: calc(var(--dlt) + calc(var(--ladl)*19) + var(--mrt)); }
  .m2 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m2 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m2 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m2 .word:nth-child(1) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*3); }
  .m2 .word:nth-child(1) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }
  .m2 .word:nth-child(1) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*5); }
  .m2 .word:nth-child(1) .letter:nth-of-type(7) { animation-delay: calc(var(--dlt) + var(--ladl)*6); }
  .m2 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*7); }
  .m2 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*8); }
  .m2 .word:nth-child(2) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*9); }
  .m2 .word:nth-child(2) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*10); }
  .m2 .word:nth-child(3) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*11); }
  .m2 .word:nth-child(3) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*12); }
  .m2 .word:nth-child(3) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*13); }
  .m2 .word:nth-child(3) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*14); }
  .m2 .word:nth-child(3) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*15); }
  .m2 .word:nth-child(3) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*16); }
  .m2 .word:nth-child(4) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*17); }
  .m2 .word:nth-child(4) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*18); }
  .m2 .word:nth-child(4) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*19); }
  .m2 .word:nth-child(4) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*20); }
  .m2 .word:nth-child(4) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*21); }

  .m3 { --dlt: calc(calc(var(--ladl)*29) + calc(var(--mrt)*2) + calc(var(--mad)*2)); animation-delay: calc(var(--dlt) + calc(var(--ladl)*29) + var(--mrt)); }
  .m3 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m3 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m3 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m3 .word:nth-child(1) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*3); }
  .m3 .word:nth-child(1) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }
  .m3 .word:nth-child(1) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*5); }
  .m3 .word:nth-child(1) .letter:nth-of-type(7) { animation-delay: calc(var(--dlt) + var(--ladl)*6); }
  .m3 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*7); }
  .m3 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*8); }
  .m3 .word:nth-child(2) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*9); }
  .m3 .word:nth-child(2) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*10); }
  .m3 .word:nth-child(3) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*11); }
  .m3 .word:nth-child(3) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*12); }
  .m3 .word:nth-child(4) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*13); }
  .m3 .word:nth-child(4) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*14); }
  .m3 .word:nth-child(4) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*15); }
  .m3 .word:nth-child(5) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*16); }
  .m3 .word:nth-child(5) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*17); }
  .m3 .word:nth-child(5) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*18); }
  .m3 .word:nth-child(5) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*19); }
  .m3 .word:nth-child(5) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*20); }
  .m3 .word:nth-child(5) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*21); }
  .m3 .word:nth-child(5) .letter:nth-of-type(7) { animation-delay: calc(var(--dlt) + var(--ladl)*22); }
  .m3 .word:nth-child(5) .letter:nth-of-type(8) { animation-delay: calc(var(--dlt) + var(--ladl)*23); }
  .m3 .word:nth-child(5) .letter:nth-of-type(9) { animation-delay: calc(var(--dlt) + var(--ladl)*24); }
  .m3 .word:nth-child(5) .letter:nth-of-type(10) { animation-delay: calc(var(--dlt) + var(--ladl)*25); }
  .m3 .word:nth-child(6) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*26); }
  .m3 .word:nth-child(6) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*27); }
  .m3 .word:nth-child(6) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*28); }
  .m3 .word:nth-child(6) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*29); }
  .m3 .word:nth-child(6) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*30); }

  .m4 { --dlt: calc(calc(var(--ladl)*58) + calc(var(--mrt)*3) + calc(var(--mad)*3)); animation-delay: calc(var(--dlt) + calc(var(--ladl)*41) + var(--mrt)); }
  .m4 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m4 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m4 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m4 .word:nth-child(1) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }
  .m4 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*20); }
  .m4 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*21); }
  .m4 .word:nth-child(2) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*22); }
  .m4 .word:nth-child(2) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*23); }
  .m4 .word:nth-child(3) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*24); }
  .m4 .word:nth-child(3) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*25); }
  .m4 .word:nth-child(3) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*26); }
  .m4 .word:nth-child(3) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*27); }
  .m4 .word:nth-child(3) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*28); }
  .m4 .word:nth-child(3) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*29); }
  .m4 .word:nth-child(4) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*30); }
  .m4 .word:nth-child(4) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*31); }
  .m4 .word:nth-child(5) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*32); }
  .m4 .word:nth-child(5) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*33); }
  .m4 .word:nth-child(5) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*34); }
  .m4 .word:nth-child(5) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*35); }
  .m4 .word:nth-child(6) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*36); }
  .m4 .word:nth-child(6) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*37); }
  .m4 .word:nth-child(6) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*38); }
  .m4 .word:nth-child(6) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*39); }
  .m4 .word:nth-child(6) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*40); }
  .m4 .word:nth-child(6) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*41); }
  .m4 .word:nth-child(6) .letter:nth-of-type(7) { animation-delay: calc(var(--dlt) + var(--ladl)*42); }

  .m5 { --dlt: calc(calc(var(--ladl)*99) + calc(var(--mrt)*4) + calc(var(--mad)*4)); animation-delay: calc(var(--dlt) + calc(var(--ladl)*18) + var(--mrt)); }
  .m5 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m5 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m5 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m5 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*3); }
  .m5 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }
  .m5 .word:nth-child(3) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*5); }
  .m5 .word:nth-child(3) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*6); }
  .m5 .word:nth-child(3) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*7); }
  .m5 .word:nth-child(3) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*8); }
  .m5 .word:nth-child(4) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*9); }
  .m5 .word:nth-child(4) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*10); }
  .m5 .word:nth-child(5) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*11); }
  .m5 .word:nth-child(5) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*12); }
  .m5 .word:nth-child(5) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*13); }
  .m5 .word:nth-child(6) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*14); }
  .m5 .word:nth-child(6) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*15); }
  .m5 .word:nth-child(6) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*16); }
  .m5 .word:nth-child(6) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*17); }
  .m5 .word:nth-child(6) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*18); }
  .m5 .word:nth-child(6) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*19); }

  .m6 { --dlt: calc(var(--ltod) + var(--bld)); animation-delay: calc(var(--dlt) + calc(var(--ladl)*28) + var(--mrt)); }
  .m6 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m6 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m6 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m6 .word:nth-child(2) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*3); }
  .m6 .word:nth-child(2) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }
  .m6 .word:nth-child(2) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*5); }
  .m6 .word:nth-child(3) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*6); }
  .m6 .word:nth-child(4) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*7); }
  .m6 .word:nth-child(4) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*8); }
  .m6 .word:nth-child(4) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*9); }
  .m6 .word:nth-child(4) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*10); }
  .m6 .word:nth-child(4) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*11); }
  .m6 .word:nth-child(4) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*12); }
  .m6 .word:nth-child(5) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*13); }
  .m6 .word:nth-child(5) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*14); }
  .m6 .word:nth-child(5) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*15); }
  .m6 .word:nth-child(5) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*16); }
  .m6 .word:nth-child(5) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*17); }
  .m6 .word:nth-child(5) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*18); }
  .m6 .word:nth-child(6) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*19); }
  .m6 .word:nth-child(6) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*20); }
  .m6 .word:nth-child(6) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*21); }
  .m6 .word:nth-child(6) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*22); }
  .m6 .word:nth-child(7) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*23); }
  .m6 .word:nth-child(7) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*24); }
  .m6 .word:nth-child(7) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*25); }
  .m6 .word:nth-child(7) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*26); }
  .m6 .word:nth-child(7) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*27); }
  .m6 .word:nth-child(7) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*28); }
  .m6 .word:nth-child(7) .letter:nth-of-type(7) { animation-delay: calc(var(--dlt) + var(--ladl)*29); }

  .m7 { --dlt: var(--ghsd); animation-delay: calc(var(--dlt) + calc(var(--ladl)*3) + var(--mrt)); }
  .m7 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m7 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m7 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m7 .word:nth-child(1) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*3); }
  .m7 .word:nth-child(1) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }

  .m8 { --dlt: calc(calc(var(--ladl)*148) + calc(var(--mrt)*7) + calc(var(--mad)*7) + var(--ald)); animation-delay: calc(var(--dlt) + calc(var(--ladl)*19) + var(--mrt)); }
  .m8 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m8 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m8 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m8 .word:nth-child(1) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*3); }
  .m8 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }
  .m8 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*5); }
  .m8 .word:nth-child(2) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*6); }
  .m8 .word:nth-child(2) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*7); }
  .m8 .word:nth-child(2) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*8); }
  .m8 .word:nth-child(2) .letter:nth-of-type(6) { animation-delay: calc(var(--dlt) + var(--ladl)*9); }
  .m8 .word:nth-child(3) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*10); }
  .m8 .word:nth-child(3) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*11); }
  .m8 .word:nth-child(4) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*12); }
  .m8 .word:nth-child(4) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*13); }
  .m8 .word:nth-child(4) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*14); }
  .m8 .word:nth-child(4) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*15); }
  .m8 .word:nth-child(5) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*16); }
  .m8 .word:nth-child(5) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*17); }
  .m8 .word:nth-child(5) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*18); }
  .m8 .word:nth-child(5) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*19); }
  .m8 .word:nth-child(5) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*20); }

  .m9 { --dlt: calc(calc(var(--ladl)*167) + calc(var(--mrt)*8) + calc(var(--mad)*8) + var(--ald)); animation-delay: calc(var(--dlt) + calc(var(--ladl)*19) + var(--mrt)); }
  .m9 .word:nth-child(1) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)); }
  .m9 .word:nth-child(1) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*1); }
  .m9 .word:nth-child(1) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*2); }
  .m9 .word:nth-child(2) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*3); }
  .m9 .word:nth-child(2) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*4); }
  .m9 .word:nth-child(2) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*5); }
  .m9 .word:nth-child(2) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*6); }
  .m9 .word:nth-child(2) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*7); }
  .m9 .word:nth-child(3) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*8); }
  .m9 .word:nth-child(3) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*9); }
  .m9 .word:nth-child(3) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*10); }
  .m9 .word:nth-child(4) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*11); }
  .m9 .word:nth-child(4) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*12); }
  .m9 .word:nth-child(4) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*13); }
  .m9 .word:nth-child(4) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*14); }
  .m9 .word:nth-child(5) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*15); }
  .m9 .word:nth-child(5) .letter:nth-of-type(2) { animation-delay: calc(var(--dlt) + var(--ladl)*16); }
  .m9 .word:nth-child(5) .letter:nth-of-type(3) { animation-delay: calc(var(--dlt) + var(--ladl)*17); }
  .m9 .word:nth-child(5) .letter:nth-of-type(4) { animation-delay: calc(var(--dlt) + var(--ladl)*18); }
  .m9 .word:nth-child(5) .letter:nth-of-type(5) { animation-delay: calc(var(--dlt) + var(--ladl)*19); }
  .m9 .word:nth-child(6) .letter:nth-of-type(1) { animation-delay: calc(var(--dlt) + var(--ladl)*20); }

  .not-found-message {
    --stroke-size: 3px;
    --radius: 10px;
    position: relative;
    text-align: center;
    width: 80%;
    max-width: 600px;
    margin-inline: auto;
    padding-block: 5rem;
    background-image: linear-gradient(to right, var(--clr-green), var(--clr-green-darkest), var(--clr-green-darkest), var(--clr-green-darkest), var(--clr-green-darkest), var(--clr-green-darkest), var(--clr-green));
    background-position: 0%;
    background-size: 200%;
    border-radius: var(--radius);
    animation: move-border 3s linear both infinite, show-not-found 2s var(--linear-bounce) backwards, turn-on-light 10s infinite both, stay-off var(--end) backwards;
    animation-delay: var(--end), var(--end), var(--ltod), 0s;
    transition: transform 0.2s;
  }
  .not-found-message .text {
    position: absolute;
    top: 50%;
    left: 50%;
    width: max-content;
    padding: 0.5rem 1rem;
    font-size: 1.5rem;
    text-align: center;
    color: #fff;
    background-color: #111;
    border: var(--clr-green) 1px solid;
    border-radius: 10px;
    box-shadow: 0px 0px 3px var(--clr-green) inset;
    transform: translate(-50%, -50%);
    transition: all 0.2s;
    z-index: 2;
  }
  .not-found-message::before {
    content: "";
    position: absolute;
    top: var(--stroke-size);
    left: var(--stroke-size);
    width: calc(100% - calc(var(--stroke-size) * 2));
    height: calc(100% - calc(var(--stroke-size) * 2));
    background: url("data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2274%22%20height%3D%2244%22%20viewBox%3D%22-10%20-10%2064%2034%22%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%22108%22%20height%3D%2248%22%20fill%3D%22%23111%22%3E%3C%2Frect%3E%3Crect%20x%3D%2210%22%20y%3D%222%22%20width%3D%222%22%20height%3D%222%22%20fill%3D%22%23fff%22%3E%3C%2Frect%3E%3Crect%20x%3D%2212%22%20y%3D%222%22%20width%3D%222%22%20height%3D%222%22%20fill%3D%22%23fff%22%3E%3C%2Frect%3E%3C%2Fsvg%3E"), #111;
    background-repeat: repeat;
    animation: move404 4s linear infinite;
    animation-delay: calc(var(--end) + 2s);
    border-radius: var(--radius);
    z-index: 1;
    transition: all 0.2s;
  }

  @keyframes stay-off { 0%,100% { opacity: 0; } }
  @keyframes move404 { from { background-position: 0 0; } to { background-position: calc(74px * 4) calc(44px * 2); } }
  @keyframes move-border { from { background-position: 0%; } to { background-position: 200%; } }
  @keyframes show-not-found {
    0% { visibility: hidden; transform: rotateX(-90deg) scale(0.9); filter: blur(15px); transform-origin: top center; }
    1% { visibility: visible; transform: rotateX(-90deg) scale(0.9); filter: blur(15px); transform-origin: top center; }
    100% { visibility: visible; transform: rotateX(0deg) scale(1); filter: blur(0px); transform-origin: top center; }
  }

  .go-home {
    display: inline-block;
    position: relative;
    margin-top: 1rem;
    padding: 0.25rem 0.75rem;
    color: white;
    text-decoration: none;
    font-family: cursive;
    overflow: hidden;
    animation: go-home-show-up 1s var(--linear-bounce) backwards, turn-on-light 10s infinite both;
    animation-delay: var(--ghsd), var(--ltod);
    transition: all 0.2s;
    will-change: transform;
  }
  .go-home::before {
    --stroke-size: 1px;
    content: "";
    position: absolute;
    top: var(--stroke-size);
    left: var(--stroke-size);
    width: calc(100% - calc(var(--stroke-size) * 2));
    height: calc(100% - calc(var(--stroke-size) * 2));
    background-color: #111;
    z-index: 1;
  }
  .go-home .text {
    position: relative;
    color: #fff;
    text-shadow: 0 0 4px #fff;
    z-index: 1;
  }
  .go-home:hover { transform: scale(1.05); }
  .go-home:hover .glow { width: 110%; height: 110%; animation-play-state: paused; }

  .go-home .glow {
    position: absolute;
    top: 0;
    left: 0;
    transform: translate(-50%, -50%);
    width: 15px;
    height: 15px;
    background-color: var(--clr-green);
    border-radius: 50%;
    filter: blur(5px);
    animation-delay: calc(var(--ghsd) + 1s);
    animation-play-state: running;
    transition: all 0.4s;
    z-index: -1;
  }
  .go-home .glow.g1 { top: 0; left: 100%; animation: g1-move 4s linear both infinite; }
  .go-home .glow.g2 { top: 0; left: 0; animation: g2-move 4s linear both infinite; }
  .go-home .glow.g3 { top: 100%; left: 0; animation: g3-move 4s linear both infinite; }
  .go-home .glow.g4 { top: 100%; left: 100%; animation: g4-move 4s linear both infinite; }

  @keyframes turn-on-light { 0% { opacity: 0.2; } 1% { opacity: 1; } 2% { opacity: 0.2; } 3% { opacity: 1; } 60% { opacity: 1; } 61% { opacity: 0.2; } 64% { opacity: 0.2; } 65% { opacity: 1; } 99% { opacity: 1; } 100% { opacity: 0.2; } }
  @keyframes go-home-show-up { 0% { transform: translateY(30px); opacity: 0; visibility: hidden; } 10% { transform: translateY(30px); opacity: 1; visibility: visible; } 100% { transform: translateY(0px); opacity: 1; visibility: visible; } }
  @keyframes g1-move { 0% { top: 0; left: 100%; } 25% { top: 0; left: 0; } 50% { top: 100%; left: 0; } 75% { top: 100%; left: 100%; } 100% { top: 0; left: 100%; } }
  @keyframes g2-move { 0% { top: 0; left: 0; } 25% { top: 100%; left: 0; } 50% { top: 100%; left: 100%; } 75% { top: 0; left: 100%; } 100% { top: 0; left: 0; } }
  @keyframes g3-move { 0% { top: 100%; left: 0; } 25% { top: 100%; left: 100%; } 50% { top: 0; left: 100%; } 75% { top: 0; left: 0; } 100% { top: 100%; left: 0; } }
  @keyframes g4-move { 0% { top: 100%; left: 100%; } 25% { top: 0; left: 100%; } 50% { top: 0; left: 0; } 75% { top: 100%; left: 0; } 100% { top: 100%; left: 100%; } }

  @media (width < 500px) {
    .message { font-size: 1.7rem; }
  }
`;

export default StyledWrapper;
