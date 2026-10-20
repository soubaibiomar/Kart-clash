/** Physical speed profile carried by track brains; old brains keep their original 4.8 cap. */
class TrackPace{
 static validate(profile){if(!profile||profile.schema!=='track-pace-v1'||!Number.isFinite(profile.maxSpeed)||profile.maxSpeed<1.2||profile.maxSpeed>8)throw Error('Profil de vitesse invalide (1,2–8).');return {schema:'track-pace-v1',maxSpeed:profile.maxSpeed};}
 static speed(model){return model?.driving!==undefined?this.validate(model.driving).maxSpeed:4.8;}
 static apply(k,model){k.normal.speed=this.speed(model);}
}
