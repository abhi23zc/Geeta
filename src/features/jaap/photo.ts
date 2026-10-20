import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { jaapId } from './provider';
export async function pickJaapPhoto():Promise<string|null>{
 const chosen=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:1,exif:false});
 if(chosen.canceled||!chosen.assets[0])return null;
 const asset=chosen.assets[0],context=ImageManipulator.manipulate(asset.uri),max=Math.max(asset.width,asset.height);
 if(max>1600)context.resize(asset.width>=asset.height?{width:1600}:{height:1600});
 const rendered=await context.renderAsync(),image=await rendered.saveAsync({format:SaveFormat.JPEG,compress:.85});
 const source=new File(image.uri),destination=new File(Paths.document,`${jaapId()}.jpg`);source.copy(destination);
 if(!destination.exists)throw Error('Your photo could not be saved.');
 return destination.uri;
}
