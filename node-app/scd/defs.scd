(
SynthDef("sine123", { arg freq=800, gate=0;
	var sig, env;
	env = EnvGen.kr(Env.adsr(0.05, 0.1, 0.5, 3), gate);
	sig = Blip.ar(freq);
	sig = sig * env;

	Out.ar(0, sig); // send output to audio bus zero.
}).writeDefFile; // write the def to disk in the default directory synthdefs/
)
