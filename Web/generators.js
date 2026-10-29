/* Sounds made as they play rather than recorded: three colours of noise, and binaural beats as Moodist makes them
 * (src/components/modals/binaural/binaural.tsx: two tones half a beat either side of the base, one in each ear).
 */
var RoomGenerators = (function () {
  'use strict';

  // Ten seconds of noise, looped: long enough that the loop is never heard in something with no pattern to it.
  function noiseBuffer(context, colour) {
    var length = context.sampleRate * 10, buffer = context.createBuffer(2, length, context.sampleRate);
    for (var channel = 0; channel < 2; channel++) {
      var data = buffer.getChannelData(channel), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (var i = 0; i < length; i++) {
        var white = Math.random() * 2 - 1;
        if (colour === 'white') {
          data[i] = white * 0.25;
        } else if (colour === 'pink') {
          // Paul Kellet's filter: noise that falls 3 dB an octave.
          b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
          b6 = white * 0.115926;
        } else {
          // Brown: each sample a small step from the last, leaking back towards zero.
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 2.4;
        }
      }
      // The ends meet without a click: fade the last few milliseconds into the first sample.
      var tail = Math.floor(context.sampleRate * 0.01);
      for (var j = 0; j < tail; j++) {
        var k = length - tail + j, w = j / tail;
        data[k] = data[k] * (1 - w) + data[0] * w;
      }
    }
    return buffer;
  }

  // A source that starts and stops like a looped recording: `connect`, `start`, `stop`.
  function noise(context, colour) {
    var source = context.createBufferSource();
    source.buffer = noiseBuffer(context, colour);
    source.loop = true;
    return source;
  }

  function binaural(context, base, beat) {
    var left = context.createOscillator(), right = context.createOscillator(), merger = context.createChannelMerger(2);
    left.frequency.value = base - beat / 2;
    right.frequency.value = base + beat / 2;
    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    return {
      connect: function (node) { merger.connect(node); },
      start: function () { left.start(); right.start(); },
      stop: function () { try { left.stop(); right.stop(); } catch (e) {} merger.disconnect(); }
    };
  }

  return { noise: noise, binaural: binaural };
})();
